import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test"

const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:4060/api"

const ADMIN = { email: "admin@example.com", password: "adminpassword" }
const USER = { email: "deepduckthoughts@example.com", password: "password2" }

async function signIn(page: Page, { email, password }: typeof ADMIN) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("button", { name: "User menu" })).toBeVisible()
}

async function signedInPage(browser: Browser, account: typeof ADMIN) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await signIn(page, account)
  return page
}

async function postQuack(request: APIRequestContext, text: string): Promise<string> {
  const response = await request.post(`${API_URL}/quacks`, { data: { text } })
  expect(response.status()).toBe(201)
  return ((await response.json()) as { id: string }).id
}

test.describe("deleting someone else's quack", () => {
  let quackId: string
  let text: string
  let author: Page
  let admin: Page

  test.beforeEach(async ({ browser }) => {
    text = `e2e quack ${Date.now()}`
    author = await signedInPage(browser, USER)
    quackId = await postQuack(author.request, text)
    admin = await signedInPage(browser, ADMIN)
  })

  test.afterEach(async () => {
    // Already gone when the test deleted it; 404 is fine.
    await admin?.request.delete(`${API_URL}/quacks/${quackId}`)
    await author?.context().close()
    await admin?.context().close()
  })

  test("a moderator deletes it from the feed", async () => {
    const quack = admin.getByRole("article").filter({ hasText: text })
    await expect(quack).toBeVisible()

    await quack.getByRole("button", { name: "Delete" }).click()
    await admin.getByRole("dialog").getByRole("button", { name: "Delete" }).click()

    await expect(quack).toBeHidden()
    await admin.reload()
    await expect(admin.getByRole("article").filter({ hasText: text })).toBeHidden()
  })

  test("a regular user gets 403 and sees no Delete button", async ({ browser }) => {
    const other = await signedInPage(browser, {
      email: "breadcritic@example.com",
      password: "password3",
    })

    await expect(other.getByRole("article").filter({ hasText: text })).toBeVisible()
    await expect(
      other.getByRole("article").filter({ hasText: text }).getByRole("button", { name: "Delete" }),
    ).toHaveCount(0)

    const response = await other.request.delete(`${API_URL}/quacks/${quackId}`)
    expect(response.status()).toBe(403)

    await other.context().close()
  })
})

test("deleting without signing in is rejected with 401", async ({ request }) => {
  const response = await request.delete(`${API_URL}/quacks/anything`)
  expect(response.status()).toBe(401)
})
