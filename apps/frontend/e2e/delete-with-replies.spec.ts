import { expect, test, type Browser, type Page } from "@playwright/test"

const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:4060/api"

const AUTHOR = { email: "deepduckthoughts@example.com", password: "password2" }
const REPLIER = { email: "breadcritic@example.com", password: "password3" }
const ADMIN = { email: "admin@example.com", password: "adminpassword" }

type Account = typeof AUTHOR

async function signedInPage(browser: Browser, { email, password }: Account) {
  const page = await (await browser.newContext()).newPage()
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("button", { name: "User menu" })).toBeVisible()
  return page
}

async function post(page: Page, path: string, data: object): Promise<string> {
  const response = await page.request.post(`${API_URL}/${path}`, { data })
  expect(response.status()).toBe(201)
  return ((await response.json()) as { id: string }).id
}

// A deleted quack that others answered stays behind as a placeholder, so these
// tests leave a few empty rows in the dev database by design.
test.describe("deleting posts that others replied to", () => {
  let text: string
  let quackId: string
  let author: Page
  let replier: Page

  test.beforeEach(async ({ browser }) => {
    text = `e2e tombstone ${Date.now()}`
    author = await signedInPage(browser, AUTHOR)
    replier = await signedInPage(browser, REPLIER)
    quackId = await post(author, "quacks", {
      text,
      mood: "happy",
      pollOptions: ["secret option A", "secret option B"],
    })
    await post(replier, `quacks/${quackId}/replies`, { text: "reply that stays" })
  })

  test.afterEach(async () => {
    for (const page of [author, replier]) await page.context().close()
  })

  test("the author deletes: grey line stays, replies stay, nothing leaks from the API", async () => {
    const quack = author.getByRole("article").filter({ hasText: text })
    await quack.getByRole("button", { name: "Delete" }).click()
    await author.getByRole("dialog").getByRole("button", { name: "Delete" }).click()

    await expect(author.getByText(text)).toHaveCount(0)
    await author.reload()

    // The placeholder is the feed item that has the reply under it.
    const placeholder = author
      .locator("article:not(article article)")
      .filter({ hasText: "Quack byl smazán" })
      .filter({ has: author.getByRole("button", { name: "1 odpověď" }) })
      .first()
    await expect(placeholder).toBeVisible()
    await expect(placeholder.getByRole("button", { name: "Odpovědět" })).toHaveCount(0)
    await expect(placeholder.getByRole("button", { name: "Delete" })).toHaveCount(0)
    await placeholder.getByRole("button", { name: "1 odpověď" }).click()
    await expect(placeholder.getByText("reply that stays")).toBeVisible()
    await expect(placeholder.getByText("BreadCritic")).toBeVisible()

    // Not under Mine, not in the search.
    await author.getByRole("tab", { name: "Mine" }).click()
    await expect(author.getByText("Quack byl smazán")).toHaveCount(0)

    // The API says nothing about content, mood, poll or author — also to a moderator.
    const feed = await replier.request.get(`${API_URL}/quacks`)
    const row = ((await feed.json()) as Record<string, unknown>[]).find((q) => q.id === quackId)
    expect(row).toMatchObject({
      deleted: true,
      text: null,
      mood: null,
      poll: null,
      user: null,
      userId: null,
      replyCount: 1,
    })
    expect(JSON.stringify(row)).not.toContain("secret option")

    // Gone for good: a second delete is a 404, and nobody can reply to it.
    expect((await author.request.delete(`${API_URL}/quacks/${quackId}`)).status()).toBe(404)
    const reply = await replier.request.post(`${API_URL}/quacks/${quackId}/replies`, {
      data: { text: "too late" },
    })
    expect(reply.status()).toBe(404)
  })

  test("a deleted reply with a reaction becomes a line; one without disappears", async () => {
    const first = await post(replier, `quacks/${quackId}/replies`, { text: "answered reply" })
    await post(author, `quacks/${first}/replies`, { text: "the reaction" })
    const lonely = await post(replier, `quacks/${quackId}/replies`, { text: "lonely reply" })

    expect((await replier.request.delete(`${API_URL}/quacks/${first}`)).status()).toBe(204)
    expect((await replier.request.delete(`${API_URL}/quacks/${lonely}`)).status()).toBe(204)

    await author.reload()
    const quack = author.getByRole("article").filter({ hasText: text })
    // 3 replies were written, 1 deleted without reactions and 1 as a line: 2 count.
    await quack.getByRole("button", { name: "3 odpovědi" }).click()
    await expect(quack.getByText("Odpověď byla smazána")).toBeVisible()
    await expect(quack.getByText("answered reply")).toHaveCount(0)
    await expect(quack.getByText("lonely reply")).toHaveCount(0)
    await expect(quack.getByText("v odpovědi na smazanou odpověď")).toBeVisible()
    await expect(quack.getByText("reply that stays")).toBeVisible()
  })

  test("a moderator deleting someone else's quack with replies gets the same placeholder", async ({
    browser,
  }) => {
    const admin = await signedInPage(browser, ADMIN)
    expect((await admin.request.delete(`${API_URL}/quacks/${quackId}`)).status()).toBe(204)
    const feed = await admin.request.get(`${API_URL}/quacks`)
    const row = ((await feed.json()) as Record<string, unknown>[]).find((q) => q.id === quackId)
    expect(row).toMatchObject({ deleted: true, text: null, userId: null })
    await admin.context().close()
  })

  test("a regular user is still refused with 403 and nothing changes", async () => {
    expect((await replier.request.delete(`${API_URL}/quacks/${quackId}`)).status()).toBe(403)
    await author.reload()
    await expect(author.getByText(text)).toBeVisible()
  })
})

test("a quack without replies disappears completely", async ({ browser }) => {
  const author = await signedInPage(browser, AUTHOR)
  const text = `e2e plain ${Date.now()}`
  const id = await post(author, "quacks", { text })

  expect((await author.request.delete(`${API_URL}/quacks/${id}`)).status()).toBe(204)
  const feed = await author.request.get(`${API_URL}/quacks`)
  expect(((await feed.json()) as { id: string }[]).some((q) => q.id === id)).toBe(false)
  await author.context().close()
})
