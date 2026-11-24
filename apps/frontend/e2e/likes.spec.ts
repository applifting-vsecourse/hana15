import { expect, test, type Browser, type Page } from "@playwright/test"

// Likes (cases.md, section 3: E1-E6). Runs against the app from `pnpm dev`.
// Assumed UI contract (the feature is not built yet): every live quack and reply
// has a button named "Líbí se mi" with aria-pressed, and the count is its text.

const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:4060/api"

const AUTHOR = { email: "deepduckthoughts@example.com", password: "password2" }
const USER_A = { email: "caffeinatedduck@example.com", password: "password1" }
const USER_B = { email: "breadcritic@example.com", password: "password3" }
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

async function post(page: Page, path: string, text: string): Promise<string> {
  const response = await page.request.post(`${API_URL}/${path}`, { data: { text } })
  expect(response.status()).toBe(201)
  return ((await response.json()) as { id: string }).id
}

const likeButton = (scope: ReturnType<Page["locator"]>) =>
  scope.getByRole("button", { name: /Líbí se mi/ }).first()

test.describe("likes", () => {
  let text: string
  let quackId: string
  let a: Page
  let b: Page
  let admin: Page

  test.beforeEach(async ({ browser }) => {
    text = `e2e like ${Date.now()}`
    a = await signedInPage(browser, USER_A)
    b = await signedInPage(browser, USER_B)
    admin = await signedInPage(browser, ADMIN)
    quackId = await post(b, "quacks", text)
    await a.reload()
  })

  test.afterEach(async () => {
    // Replies first: a quack with replies can't be deleted physically.
    const replies = await admin.request.get(`${API_URL}/quacks/${quackId}/replies`)
    if (replies.ok()) {
      const list = (await replies.json()) as { id: string }[]
      for (const reply of list.reverse()) {
        await admin.request.delete(`${API_URL}/quacks/${reply.id}`)
      }
    }
    await admin.request.delete(`${API_URL}/quacks/${quackId}`)
    for (const page of [a, b, admin]) await page.context().close()
  })

  test("E1 + E2: a quack starts at 0; like and unlike survive a reload", async () => {
    const quack = a.getByRole("article").filter({ hasText: text })
    await expect(likeButton(quack)).toHaveText("0")
    await expect(likeButton(quack)).toHaveAttribute("aria-pressed", "false")

    await likeButton(quack).click()
    await expect(likeButton(quack)).toHaveText("1")
    await expect(likeButton(quack)).toHaveAttribute("aria-pressed", "true")
    await a.reload()
    await expect(likeButton(quack)).toHaveText("1")
    await expect(likeButton(quack)).toHaveAttribute("aria-pressed", "true")

    await likeButton(quack).click()
    await expect(likeButton(quack)).toHaveText("0")
    await expect(likeButton(quack)).toHaveAttribute("aria-pressed", "false")
    await a.reload()
    await expect(likeButton(quack)).toHaveText("0")
    await expect(likeButton(quack)).toHaveAttribute("aria-pressed", "false")
  })

  test("E3: liking a reply counts for the reply only", async () => {
    const replyText = `e2e like reply ${Date.now()}`
    await post(b, `quacks/${quackId}/replies`, replyText)
    await a.reload()

    const quack = a.getByRole("article").filter({ hasText: text })
    await quack.getByRole("button", { name: "1 odpověď" }).click()
    const reply = quack.getByRole("article").filter({ hasText: replyText })
    await likeButton(reply).click()

    await expect(likeButton(reply)).toHaveText("1")
    await expect(likeButton(quack)).toHaveText("0")
  })

  test("E4: someone else's like shows as a count without marking my button, and not who", async () => {
    await b.request.put(`${API_URL}/quacks/${quackId}/like`)
    await a.reload()

    const quack = a.getByRole("article").filter({ hasText: text })
    await expect(likeButton(quack)).toHaveText("1")
    await expect(likeButton(quack)).toHaveAttribute("aria-pressed", "false")

    await likeButton(quack).click()
    await expect(likeButton(quack)).toHaveText("2")
    await expect(likeButton(quack)).toHaveAttribute("aria-pressed", "true")
    // Nobody is named as the one who liked (the author's own name is on the quack, so look for A and the like text).
    await expect(quack.getByText(/lajk(nul|la|li)|liked by/i)).toHaveCount(0)
  })

  test("E5: a server refusal rolls the optimistic change back", async () => {
    await a.route(`${API_URL}/quacks/${quackId}/like`, (route) =>
      route.fulfill({ status: 500, body: "{}" }),
    )
    const quack = a.getByRole("article").filter({ hasText: text })
    await expect(likeButton(quack)).toHaveText("0")

    await likeButton(quack).click()

    await expect(likeButton(quack)).toHaveText("0")
    await expect(likeButton(quack)).toHaveAttribute("aria-pressed", "false")
  })

  test("E6: a placeholder row has neither a like button nor a count", async () => {
    await post(admin, `quacks/${quackId}/replies`, "keeps the placeholder alive")
    await b.request.put(`${API_URL}/quacks/${quackId}/like`)
    expect((await b.request.delete(`${API_URL}/quacks/${quackId}`)).status()).toBe(204)
    await a.reload()

    const placeholder = a
      .locator("article:not(article article)")
      .filter({ hasText: "Quack byl smazán" })
      .filter({ has: a.getByRole("button", { name: "1 odpověď" }) })
      .first()
    await expect(placeholder).toBeVisible()
    await expect(placeholder.getByRole("button", { name: /Líbí se mi/ })).toHaveCount(0)
    await expect(placeholder.getByText(/^\d+$/)).toHaveCount(0)
  })
})
