const { Octokit } = require("@octokit/rest");
const core=require('@actions/core');

function checkWhitelist(username, whitelist) {
    console.log("Checking whitelist of " + username)
    return whitelist.split(',').includes(username);
}

async function checkTeamMembership(github_token, username, org, team_slug) {
    console.log("Checking team membership " + username)
    const octokit = new Octokit({
        auth: github_token,
    });

    try {
        const membership = await octokit.rest.teams.getMembershipForUserInOrg({
            org,
            team_slug,
            username,
        });
        
        if (membership.data.state == 'active') {
            return true;
        }
    } catch (error) {
        if (error.status >= 500) {
            console.log("There was an error checking a team membership. This is likely a GitHub API error. Status code: " + error.status)
            console.log(JSON.stringify(error))
        }
        return false
    }

    return false;
}

async function singleCheck(github_token, team_slug, org, username, whitelist) {
    console.log("Checking user '" + username + "' in org '" + org + "' in team '" + team_slug + "' or against whitelist '" + whitelist + "'")

    let whitelisted = false;
    let team_member = false;

    if ( whitelist != '') {
        if (checkWhitelist(username, whitelist)) {
            whitelisted = true;
            core.setOutput('whitelisted', true);
            core.setOutput('authorized', true);
            core.setOutput('team_member', false);
        }
    }
    if (team_slug =! '') {
        if (!whitelisted){
            let team_membership = await checkTeamMembership(github_token, username, org, team_slug)
            if (team_membership) {
                team_member = true;
                core.setOutput('team_member', true);
                core.setOutput('authorized', true);
                core.setOutput('whitelisted', false);
            }
        }
    }

    console.log("User whitelisted:" + whitelisted + ", team member: " + team_member);
}

async function multiCheck(github_token, team_slug, org, username, whitelist, multi_delimiter) {
    const users = username.split(multi_delimiter);
    let outputs = {
        authorized: [],
        team_member: [],
        whitelisted: []
    };
    for (let user of users) {
        let whitelisted = false;
        let team_member = false;
        let authorized = false;

        if ( whitelist != '') {
            if (checkWhitelist(user, whitelist)) {
                whitelisted = true
                authorized = true
                team_member = false
            }
        }
    
        if (team_slug =! '') {
            if (!whitelisted){
                let team_membership = await checkTeamMembership(github_token, user, org, team_slug)
                if (team_membership) {
                    team_member = true;
                    authorized = true;
                    whitelisted = false;
                }
            }
        }
        console.log("User " + user + " whitelisted:" + whitelisted + ", team member: " + team_member);
        outputs.authorized.push(authorized)
        outputs.team_member.push(team_member)
        outputs.whitelisted.push(whitelisted)
    }
    core.setOutput('team_member', outputs.team_member.join(','));
    core.setOutput('authorized', outputs.authorized.join(','));
    core.setOutput('whitelisted', outputs.whitelisted.join(','));
}


async function run(){
    github_token = core.getInput('github_token');
    team_slug = core.getInput('team');
    org = core.getInput('org');
    username = core.getInput('username');
    whitelist = core.getInput('whitelist');
    multi_user = core.getInput('multi_user') == 'true' ? true : false;
    multi_delimiter = core.getInput('multi_delimiter');

    if (multi_user) {
        await multiCheck(github_token, team_slug, org, username, whitelist, multi_delimiter);
    } else {
        await singleCheck(github_token, team_slug, org, username, whitelist);
    }
}

run().catch(err => {    
    console.log(err);
    core.setFailed(err.message);
});