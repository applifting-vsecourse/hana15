// Czech plural: 1 odpověď, 2–4 odpovědi, 0 and 5+ odpovědí.
export function replyCountLabel(count: number): string {
  if (count === 1) return "1 odpověď"
  if (count >= 2 && count <= 4) return `${count} odpovědi`
  return `${count} odpovědí`
}
