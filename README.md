# Dance

A personal page of dance video links. It is a copy of the
[links](https://github.com/jqw22/links) page, pointed at this repo instead.
Add or delete links in the browser and they are saved to `links.json` in this
repo, so the same list appears on every device.

## How it works

- `index.html` — the page. It reads `links.json` from GitHub on load and shows the list.
- `links.json` — the single source of truth for the links.

When you add or remove a link, the page commits the updated `links.json` straight
back to this repository using the GitHub API.

## Token

Saving needs a fine-grained GitHub token with **Contents → Read and write** on
`jqw22/dance`. You can use the same token as the links page: edit it at
[github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens)
and add `jqw22/dance` to its repository access.

If this browser already has a token saved by the links page (or by the old dance
app), the page picks it up automatically. Otherwise paste it under
**⚙ GitHub sync setup** and click **Save settings**. The token is stored only in
that browser and is sent only to GitHub.

Owner (`jqw22`), repo (`dance`), branch (`main`) and path (`links.json`) are pre-filled.
Settings are kept separately from the links page, even though both are on
`jqw22.github.io`.

## Editing

Each YouTube link shows as a thumbnail in a grid; click it to play the video in place,
or click the title to open it on YouTube. Other links get a plain card.

Click **Edit Links** to show the add/delete controls, and **Done Editing** when
finished. Headings can be added and renamed; headings are listed A to Z. Use
**↻ Reload from GitHub** to pull the latest list.
