const { Octokit } = require("@octokit/rest");
const core=require('@actions/core');

function checkWhitelist(username, whitelist) {
    console.log("Checking whitelist")
    return whitelist.split(',').includes(username);
}

async function checkTeamMembership(github_token, username, org, team_slug) {
    console.log("Checking team membership")
    const octokit = new Octokit({
        auth: github_token,
    });

    const membership = await octokit.rest.teams.getMembershipForUserInOrg({
        org,
        team_slug,
        username,
    });

    if (membership.state == 'active') {
        return true;
    }

    return false;
}

async function run(){
    github_token = core.getInput('github_token');
    team_slug = core.getInput('team');
    org = core.getInput('org');
    username = core.getInput('username');
    whitelist = core.getInput('whitelist');


    console.log("Checking user '" + username + "' in org '" + org + "' in team '" + team_slug + "' or against whitelist '" + whitelist + "'")

    whitelisted = false;
    team_member = false;

    if ( whitelist != '') {
        if (checkWhitelist(username, whitelist)) {
            whitelisted = true;
            core.setOutput('whitelisted', true);
            core.setOutput('authorized', true);
            core.setOutput('team_member', false);
        }
    }

    if (!whitelisted){
        if (checkTeamMembership(github_token, username, org, team_slug)) {
            team_member = true;
            core.setOutput('team_member', true);
            core.setOutput('authorized', true);
            core.setOutput('whitelisted', false);
        }
    }

    console.log("User whitelisted:" + whitelisted + ", team member: " + team_member);
}

run().catch(err => {    
    console.log(err);
    core.setFailed(err.message);
});