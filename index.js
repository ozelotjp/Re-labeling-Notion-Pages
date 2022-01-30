require('dotenv').config()
const fs = require('fs');
const { Client } = require("@notionhq/client");

const token = process.env.NOTION_TOKEN;
const notion = new Client({ auth: token });

async function getDatabase(databaseId, next_cursor = undefined) {
  const pages = [];

  const response = await notion.databases.query({
    database_id: databaseId,
    start_cursor: next_cursor,
  });
  response.results.forEach(page => {
    pages.push(page);
  });

  if (response.has_more) {
    const next = await getDatabase(databaseId, response.next_cursor);
    pages.push(...next);
  }

  return pages;
}

async function getTags() {
  const pages = await getDatabase("cb4e88fc82f14a9c8256a08019a701a7");
  const tags = pages
    .map((page) => ({
      id: page.id,
      title: page.properties["名前"].title[0].plain_text,
    }))

  return tags;
}

async function getBookmarks() {
  const pages = await getDatabase("01be0759dd87432a91333b64bae7d5c0");
  const bookmarks = pages
    .map((page) => ({
      id: page.id,
      title: page.properties["タイトル"].title[0].plain_text,
      tags: page.properties["技術タグ"].relation.map((tag) => tag.id),
    }))

  return bookmarks;
}

async function setPageTag(pageId, tagId) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      "技術タグ": {
        relation: [
          {
            "id": tagId
          }
        ]
      },
    },
  });
}

const replaces = [
  { search: "Windows", tag: "Windows" },
  { search: "Mac", tag: "Mac" },
  { search: "Linux", tag: "Linux" },
  { search: "HTML", tag: "HTML" },
  { search: "CSS", tag: "CSS" },
  { search: "JavaScript", tag: "JavaScript" },
  { search: "TypeScript", tag: "TypeScript" },
  { search: "PHP", tag: "PHP" },
  { search: "Vue", tag: "Vue" },
  { search: "Nuxt", tag: "Nuxt" },
  { search: "React", tag: "React" },
  { search: "Tailwind", tag: "Tailwind" },
  { search: "VSCode", tag: "VSCode" },
  { search: "Git", tag: "Git" },
  { search: "Notion", tag: "Notion" },
  { search: "Laravel", tag: "Laravel" },
  { search: "Vite", tag: "Vite" },
  { search: "WSL", tag: "Windows" },
  { search: "Docker", tag: "Docker" },

  { search: "Deno", tag: "Deno" },
  { search: "Firebase", tag: "Firebase" },
  { search: "Firestore", tag: "Firebase" },
  { search: "Flutter", tag: "Flutter" },
  { search: "Go", tag: "Go" },
  { search: "AWS", tag: "AWS" },
  { search: "テスト", tag: "Test" },
  { search: "DDD", tag: "DDD" },
];

(async () => {
  // タグDB
  const tags = await getTags();
  fs.writeFileSync("./debug_tags.json", JSON.stringify(tags, null, 2));

  // ブックマークDB
  const bookmarks = (await getBookmarks()).filter((bookmark) => !bookmark.tags.length);
  fs.writeFileSync("./debug_bookmarks.json", JSON.stringify(bookmarks, null, 2));

  // タグごとにブックマークを更新
  for (const replace of replaces) {
    // 更新対象のブックマーク
    const regexp = new RegExp(replace.search, "gi");
    const targets = bookmarks.filter(page => page.title.match(regexp));

    // 更新対象のタグ
    const tag = tags.find(tag => tag.title === replace.tag);

    // 更新
    for (const target of targets) {
      await setPageTag(target.id, tag.id);
      console.log(`[${tag.title}] ${target.title}`);
    }
  }
})();
