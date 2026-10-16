# Verify a release checkpoint

`v0.1.0-rc.1` is a source/tooling prerelease. Its signed annotated tag binds an exact Git commit and the SHA-256 of the release's `SHA256SUMS` file. The sums cover `release-verification.json` and the attached validation logs. The receipt names the source commit, source tree, checks and limitations. A signature authenticates the checkpoint; it does not certify a scientific conclusion.

1. Fetch the exact tag and inspect its commit and annotation:

   ```sh
   git fetch origin tag v0.1.0-rc.1
   git rev-parse 'v0.1.0-rc.1^{commit}'
   git cat-file tag v0.1.0-rc.1
   ```

2. Check the tag's **Verified** status on GitHub. For local SSH signature verification, configure a trusted `gpg.ssh.allowedSignersFile` using the maintainer identity/key obtained through a separately trusted channel, then run `git verify-tag v0.1.0-rc.1`. A locally accepted key alone does not establish its owner's identity.
3. Download the release's attached verification files into one directory. Compare `shasum -a 256 SHA256SUMS` with the digest in the signed tag annotation, then run `shasum -a 256 -c SHA256SUMS`.
4. Confirm `release-verification.json` names the same commit and tree as the tag. Check out that tag and follow the repository's documented checks.

Do not move a published tag or replace a validation receipt silently. Corrections receive a new version and explicit supersession notes. GitHub's generated source archives exclude ignored/untracked local data; their compressed bytes are not covered by the attached manifest. This release does not change any study's separately named freeze tag or deploy a service.
