# actions-authorized-user

Checks to see if a user is a member of a team or supplied whitelist.
Can also take a list of usernames to check. This allows you to count how many users are authorized.

This is intended to be used on workflows where the scope is limited to a specific set of users or Github apps.
The rights of the repo may not reflect the permissions required to run all actions.
For instance, not all maintainers should be allowed to start a production deployment.
Or of the users in a PR how many of them are in a group?

Github Apps can not be part of teams, so they will need to be part of the whitelist.
To make it easier to pass the list around, a comma separated list of users is used on the whitelist.
You can store this with the repo itself.

:warning: Beware a user with write permissions could update the whitelist file and grant themselves permissions to execute the job.
However, you'll at least have a log in the commit history of this.

## Requirements

Like all actions, it will need a github token to make calls to the API.
The Token passed onto the action needs to have at least the `org:read` permission.

## Hierarchy of checks

- Whitelist membership is checked before team membership.

- If a user is part of the whitelist, no team membership is checked.

## Inputs

| Name         | Required | Default | Description                                                             |
| ------------ | -------- | ------- | ----------------------------------------------------------------------- |
| username     | Y        | N/A     | The username(s) to check. Normally `${{ github.actor }}`                |
| team         | Y        | N/A     | The name of the team that should be allowed. A blank team will skip a team check |
| org          | Y        | N/A     | The organization to test against. Normally `${{ github.repo_owner }}`   |
| whitelist    | N        | ''      | Comma separated usernames. Intended for Github Apps or exception users. |
| github_token | Y        | N/A     | Github token with at least `org:read` in the permissions.               |
| multi_user   | N        | false   | Allows looking up multiple users in a single call.                      |
| multi_delimiter | N     | ','     | The delimiter of the usernames passed in.

## Outputs

| Name        | Description                                               |
| ----------- | --------------------------------------------------------- |
| team_member | The username was found using a team lookup.               |
| whitelisted | The username was in the supplied whitelist.               |
| authorized  | The username was in either the teams or whitelist lookup. |

If a single user is checked, you will get back a single value in each output.
If multiple users are checked, you will get back a list of values. The order is the same as the order of the users passed in.

Example of a single lookup:

```yaml
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
      uses: morfien101/actions-authorized-user@v3
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

Example of a multi lookup:
```yaml
steps:
  - id: get_token
    run: |
      echo "Get the github token you want to use"
      echo "Or use a Github App and generate the token here"
      echo "github_token=gh_abc123" >> ${{ GITHUB_OUTPUTS }}

  - name: Check list of users
    id: authorized_list
    uses: morfien101/actions-authorized-user@v3
      with:
        username: user1,user2,user3
        org: ${{ github.repo_owner }}
        team: "release_team"
        whitelist: "app1_name[bot],app2_name[bot],mona_the_cat"
        github_token: ${{ steps.get_token.outputs.github_token }}
        multi_user: true
  
  - name: How many passed
    id: enough_authorized
    shell: bash
    runs: |
      n_allowed=$(echo "${{ steps.authorized_list }}" | tr ',' '\n' | grep true | wc -l)
      if [ $n_allowed -gt 1 ]; then
        do_it="true"
      else
        do_it="false"
      fi

      echo "allowed=$do_it" >> ${{ GITHUB_OUTPUTS }}
```

## Contributing

Any changes to `main.js` has to follow a compilation step with `@vercel/ncc`.

```sh
ncc build main.js

# OR

node_modules/@vercel/ncc/dist/ncc/cli.js build main.js
```
