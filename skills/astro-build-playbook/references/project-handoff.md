# Project handoff: source archives and kit downloads

## Source archive handoff

When a source ZIP is requested, generate it from the latest project tree after fixes and
verification. Exclude dependencies, generated builds/caches, local environment files and
credentials. Verify archive integrity and the changed source files before linking it.
When extracting to a requested project directory, inspect existing files first, strip the
archive's enclosing project folder if necessary to put `package.json` directly in the
destination, and do not overwrite differing existing files without resolving the conflict.

For reusable kit/component downloads, verify the published artefact: download its ZIP,
check the published checksum, compare the complete archive contents against the release
source, then install the extracted download into an isolated project using the declared
compatible baseline (skill version) or release and run applicable checks. Record whether dependencies were
freshly installed or reused from a locked toolchain. Local-source adoption and local
archive checks do not replace verification of the published download. Run the published
artefact checks after publication is authorised and available; do not publish merely to
complete a local handoff.
