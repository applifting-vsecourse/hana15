import { expect, test, type Browser, type Page } from "@playwright/test"

const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:4060/api"

const ADMIN = { email: "admin@example.com", password: "adminpassword" }
const AUTHOR = { email: "deepduckthoughts@example.com", password: "password2" }
const REPLIER = { email: "breadcritic@example.com", password: "password3" }
const OTHER = { email: "caffeinatedduck@example.com", password: "password1" }

type Account = typeof ADMIN

async function signedInPage(browser: Browser, { email, password }: Account) {
  const page = await (await browser.newContext()).newPage()
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("button", { name: "User menu" })).toBeVisible()
  return page
}

async function post(page: Page, path: string, text: string): Promise<string> {
  const response = await page.request.post(`${API_URL}/${path}`, { data: { text } })
  expect(response.status()).toBe(201)
  return ((await response.json()) as { id: string }).id
}

test.describe("replies", () => {
  let text: string
  let quackId: string
  let author: Page
  let replier: Page
  let admin: Page

  test.beforeEach(async ({ browser }) => {
    text = `e2e reply root ${Date.now()}`
    author = await signedInPage(browser, AUTHOR)
    replier = await signedInPage(browser, REPLIER)
    admin = await signedInPage(browser, ADMIN)
    quackId = await post(author, "quacks", text)
  })

  test.afterEach(async () => {
    // Replies first: a quack with replies can't be deleted yet.
    const replies = await admin.request.get(`${API_URL}/quacks/${quackId}/replies`)
    if (replies.ok()) {
      const list = (await replies.json()) as { id: string }[]
      for (const reply of list.reverse()) {
        await admin.request.delete(`${API_URL}/quacks/${reply.id}`)
      }
    }
    await admin.request.delete(`${API_URL}/quacks/${quackId}`)
    for (const page of [author, replier, admin]) await page.context().close()
  })

  test("reply, reply to a reply, flat list, not in feed or Mine, survives reload", async () => {
    const quack = replier.getByRole("article").filter({ hasText: text })
    await expect(quack).toBeVisible()
    // No replies yet: no count, only the action.
    await expect(quack.getByRole("button", { name: /odpověď|odpovědi|odpovědí/ })).toHaveCount(0)

    await quack.getByRole("button", { name: "Odpovědět" }).click()
    await replier.getByLabel("Vaše odpověď").fill("first reply")
    await replier.getByRole("button", { name: "Odeslat" }).click()

    // Form closes and the list opens with the new reply.
    await expect(replier.getByLabel("Vaše odpověď")).toHaveCount(0)
    await expect(quack.getByText("first reply")).toBeVisible()
    await expect(quack.getByRole("button", { name: "1 odpověď" })).toBeVisible()
    await expect(quack.getByText(/v odpovědi na/)).toHaveCount(0)

    // Reply to the reply: lands in the same flat list, with the author line.
    await quack
      .getByRole("article")
      .filter({ hasText: "first reply" })
      .getByRole("button", { name: "Odpovědět" })
      .click()
    await replier.getByLabel("Vaše odpověď").fill("second reply")
    await replier.getByRole("button", { name: "Odeslat" }).click()
    const second = quack.getByRole("article").filter({ hasText: "second reply" })
    await expect(second.getByText("v odpovědi na @BreadCritic")).toBeVisible()
    await expect(quack.getByRole("button", { name: "2 odpovědi" })).toBeVisible()

    // Replies are never feed items of their own.
    // (the only feed item containing it is the root quack it hangs under)
    await expect(
      replier.locator("article:not(article article)").filter({ hasText: "first reply" }),
    ).toHaveCount(1)
    await replier.getByRole("tab", { name: "Mine" }).click()
    await expect(replier.getByText("first reply")).toHaveCount(0)

    // After a reload: count is back, list collapsed, same replies when expanded.
    await replier.reload()
    const reloaded = replier.getByRole("article").filter({ hasText: text })
    await expect(reloaded.getByText("first reply")).toHaveCount(0)
    await reloaded.getByRole("button", { name: "2 odpovědi" }).click()
    await expect(reloaded.getByText("first reply")).toBeVisible()
    await expect(reloaded.getByText("second reply")).toBeVisible()
    await reloaded.getByRole("button", { name: "2 odpovědi" }).click()
    await expect(reloaded.getByText("first reply")).toHaveCount(0)
  })

  test("an empty reply is refused with a message", async () => {
    const quack = replier.getByRole("article").filter({ hasText: text })
    await quack.getByRole("button", { name: "Odpovědět" }).click()
    await replier.getByLabel("Vaše odpověď").fill("   ")
    await replier.getByRole("button", { name: "Odeslat" }).click()
    await expect(replier.getByText("Napište odpověď.")).toBeVisible()
  })

  test("replying to a deleted quack says so and keeps the text", async () => {
    const other = await post(author, "quacks", `e2e doomed ${Date.now()}`)
    await replier.reload()
    const doomed = replier.getByRole("article").filter({ hasText: "e2e doomed" }).first()
    await doomed.getByRole("button", { name: "Odpovědět" }).click()
    await replier.getByLabel("Vaše odpověď").fill("too late")
    expect((await author.request.delete(`${API_URL}/quacks/${other}`)).status()).toBe(204)
    await replier.getByRole("button", { name: "Odeslat" }).click()
    await expect(replier.getByText("Na tohle už nejde odpovědět, bylo to smazáno.")).toBeVisible()
    await expect(replier.getByLabel("Vaše odpověď")).toHaveValue("too late")
  })

  test.describe("deleting a reply", () => {
    let replyId: string

    test.beforeEach(async () => {
      replyId = await post(replier, `quacks/${quackId}/replies`, "reply to delete")
    })

    test("another user gets 403 (server check) and sees no Delete button", async ({ browser }) => {
      const other = await signedInPage(browser, OTHER)
      const quack = other.getByRole("article").filter({ hasText: text })
      await quack.getByRole("button", { name: "1 odpověď" }).click()
      const reply = quack.getByRole("article").filter({ hasText: "reply to delete" })
      await expect(reply).toBeVisible()
      await expect(reply.getByRole("button", { name: "Delete" })).toHaveCount(0)

      expect((await other.request.delete(`${API_URL}/quacks/${replyId}`)).status()).toBe(403)
      await other.context().close()
    })

    test("the author deletes their reply after confirming; count drops", async () => {
      const quack = replier.getByRole("article").filter({ hasText: text })
      await quack.getByRole("button", { name: "1 odpověď" }).click()
      const reply = quack.getByRole("article").filter({ hasText: "reply to delete" })
      await reply.getByRole("button", { name: "Delete" }).click()
      await replier.getByRole("dialog").getByRole("button", { name: "Delete" }).click()

      await expect(quack.getByText("reply to delete")).toHaveCount(0)
      // No replies left: the count is gone, only the action stays.
      await expect(quack.getByRole("button", { name: /odpověď|odpovědi|odpovědí/ })).toHaveCount(0)
    })

    test("a moderator deletes someone else's reply", async () => {
      await admin.reload()
      const quack = admin.getByRole("article").filter({ hasText: text })
      await quack.getByRole("button", { name: "1 odpověď" }).click()
      const reply = quack.getByRole("article").filter({ hasText: "reply to delete" })
      await reply.getByRole("button", { name: "Delete" }).click()
      await admin.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
      await expect(quack.getByText("reply to delete")).toHaveCount(0)
    })
  })
})

test("replies are not reachable without signing in", async ({ request }) => {
  expect((await request.get(`${API_URL}/quacks/anything/replies`)).status()).toBe(401)
  expect(
    (await request.post(`${API_URL}/quacks/anything/replies`, { data: { text: "hi" } })).status(),
  ).toBe(401)
})

test("replying to a quack that does not exist is a 404 and a blank reply is a 400", async ({
  browser,
}) => {
  const page = await signedInPage(browser, REPLIER)
  const missing = await page.request.post(`${API_URL}/quacks/nope/replies`, {
    data: { text: "hi" },
  })
  expect(missing.status()).toBe(404)
  const blank = await page.request.post(`${API_URL}/quacks/nope/replies`, { data: { text: "  " } })
  expect(blank.status()).toBe(400)
  await page.context().close()
})
