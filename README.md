# actions-authorized-user

Checks to see if a user is a member of a team or supplied whitelist.

This is intended to be used on workflows where the scope is limited to a specific set of users or Github apps.
The rights of the repo may not reflect the permissions required to run all actions.
For instance, not all maintainers should be allowed to start a production deployment.

Github Apps can not be part of teams, so they will need to be part of the whitelist.
To make it easier to pass the list around, a comma separated list of users is used on the whitelist.
You can store this with the repo itself.

Beware a user with write permissions could update the whitelist file and grant themselves permissions to execute the job.
However, you'll at least have a log in the commit history of this.

Like all actions, it will need a github token to make calls to the API.
The Token passed onto the action needs to have at least the `org:read` permission.

Whitelist membership is checked before team membership. If a user is part of the whitelist, no team membership is checked.

## Inputs

| Name         | Required | Default | Description                                                             |
| ------------ | -------- | ------- | ----------------------------------------------------------------------- |
| username     | Y        | N/A     | The username to check. Normally `${{ github.actor }}`                   |
| team         | Y        | N/A     | The name of the team that should be allowed                             |
| org          | Y        | N/A     | The organization to test against. Normally `${{ github.repo_owner }}`   |
| whitelist    | N        | ''      | Comma separated usernames. Intended for Github Apps or exception users. |
| github_token | Y        | N/A     | Github token with at least `org:read` in the permissions.               |

## Outputs

| Name        | Description                                               |
| ----------- | --------------------------------------------------------- |
| team_member | The username was found using a team lookup.               |
| whitelisted | The username was in the supplied whitelist.               |
| authorized  | The username was in either the teams or whitelist lookup. |

Example:

```
on:
  workflow_dispatch:

jobs:
  runs-on: ubuntu-latest
  steps:
    - id: get_token
      run: |
        echo "Get the github token you want to use"
        echo "Or use a Github App and generate the token here"
        echo "github_token=gh_abc123" >> ${{ GITHUB_OUTPUTS }}
    - id: auth_check
      uses: morfien101/actions-authorized-user@main
      with:
        username: ${{ github.actor }}
        org: ${{ github.repo_owner }}
        team: "release_team"
        whitelist: "app1_name[bot],app2_name[bot],mona_the_cat"
        github_token: ${{ steps.get_token.outputs.github_token }}


    # You can either use a if statement on the steps to see if they are allowed to run.
    - name: can use a if statement on jobs
      if: ${{ steps.auth_check.outputs.authorized }}
      run: |
        echo "Do cool stuff now as this user can run this workflow."

    # Or we can just check with a step like this which will error if the user is not authorized.
    # Everything after this will not be executed.
    - name: can continue
      run: |
        if [ ${{ steps.auth_check.outputs.authorized }} != "true" ]; then
          echo "::error title=User Unauthorized::User ${{ github.actor }} is not authorized to run this workflow!"
          exit 1
        fi

    # We are safe to continue
    - name: cool stuff
      run: |
        echo "Do cool stuff now as this user can run this workflow."
```
