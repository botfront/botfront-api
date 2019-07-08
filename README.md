# Botfront API

Web services for the botfront platform.

See [Botfront](https://github.com/botfront/botfront) for more details.


## Release process

EE versions are linked to CE versions a follows: `0.15.1-ee.2` where `2` is the third version tagged on ee after `0.15.1`

1. Pull from `upstream/master`
2. Run `npx standard-version --release-as 0.15.1-ee.2 --dry-run` and verify that it looks good.
3. Then run `npx standard-version --release-as 0.15.1-ee.2`
4. Push the tags: `git push --follow-tags origin master`
