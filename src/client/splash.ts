import { requestExpandedMode } from "@devvit/web/client";

async function init() {
  await requestExpandedMode(new MouseEvent("click"), "game");
}

init().catch(e => console.error(e));
