const { Octokit } = require("@octokit/rest");
const core=require('@actions/core');

function debugLog(message) {
    if (process.env.DEBUG === 'true') {
        console.log(`DEBUG: ${message}`);
    }
}

function checkWhitelist(username, whitelist) {
    console.log("Checking whitelist of " + username)
    return whitelist.split(',').includes(username);
}

async function checkTeamMembership(github_token, username, org, team_slug) {
    console.log(`Checking team membership of ${username} in team ${team_slug}`)
    const octokit = new Octokit({
        auth: github_token,
    });

    try {
        debugLog("Checking membership via Github API")
        debugLog("org: " + org)
        debugLog("team_slug: " + team_slug)
        debugLog("username: " + username)
        const membership = await octokit.rest.teams.getMembershipForUserInOrg({
            org,
            team_slug,
            username,
        });
        
        debugLog("membership data: " + JSON.stringify(membership.data))

        if (membership.data.state == 'active') {
            return true;
        }
    } catch (error) {
        if (error.status == 404) {
            console.log("404 - User " + username + " is not a member of team " + team_slug + " in org " + org)
        }
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

    if ( whitelist !== '') {
        console.log("Checking whitelist")
        whitelisted = checkWhitelist(username, whitelist);
    }

    if ((!whitelisted) && (team_slug !== '')) {
        console.log("Checking team membership")
        let team_membership = await checkTeamMembership(github_token, username, org, team_slug)
        if (team_membership) {
            team_member = true;
        }
    }
    console.log("User whitelisted:" + whitelisted + ", team member: " + team_member);
    core.setOutput('team_member', team_member);
    core.setOutput('whitelisted', whitelisted);
    core.setOutput('authorized', ((team_member) || (whitelisted)));
}

async function multiCheck(github_token, team_slug, org, username, whitelist, multi_delimiter) {
    const users = username.split(multi_delimiter);
    let outputs = {
        authorized: [],
        team_member: [],
        whitelisted: []
    };
    for (let user of users) {
        debugLog(`Multi user mode: testing user ${user} in org ${org} in team '${team_slug}' or against whitelist '${whitelist}'`)
        let whitelisted = false;
        let team_member = false;

        if ( whitelist !== '') {
            whitelisted = checkWhitelist(user, whitelist)
        }
        if ((!whitelisted) && (team_slug !== '')) {
            let team_membership = await checkTeamMembership(github_token, user, org, team_slug)
            if (team_membership) {
                team_member = true;
            }
        }
        console.log("User " + user + " whitelisted:" + whitelisted + ", team member: " + team_member);
        outputs.authorized.push(((team_member) || (whitelisted)))
        outputs.team_member.push(team_member)
        outputs.whitelisted.push(whitelisted)
    }

    core.setOutput('team_member', outputs.team_member.join(','));
    core.setOutput('whitelisted', outputs.whitelisted.join(','));
    core.setOutput('authorized', outputs.authorized.join(','));
}


async function run(){
    github_token = core.getInput('github_token');
    team_slug = core.getInput('team');
    org = core.getInput('org');
    username = core.getInput('username');
    whitelist = core.getInput('whitelist');
    multi_user = core.getInput('multi_user') == 'true' ? true : false;
    multi_delimiter = core.getInput('multi_delimiter');

    debugLog("Inputs:")
    debugLog("github_token: " + github_token !== "" ? "set and REDACTED" : "not set")
    debugLog("team_slug: " + team_slug)
    debugLog("org: " + org)
    debugLog("username: " + username)
    debugLog("whitelist: " + whitelist)
    debugLog("multi_user: " + multi_user)
    debugLog("multi_delimiter: " + multi_delimiter)


    if (multi_user) {
        console.log("Multi user mode enabled")
        await multiCheck(github_token, team_slug, org, username, whitelist, multi_delimiter);
    } else {
        console.log("Single user mode enabled")
        await singleCheck(github_token, team_slug, org, username, whitelist);
    }
}

run().catch(err => {    
    console.log(err);
    core.setFailed(err.message);
});