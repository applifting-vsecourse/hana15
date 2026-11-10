import { api, HTTPError } from "@/lib/api-client"

export async function deleteQuack(id: string): Promise<void> {
  try {
    await api.delete(`quacks/${id}`)
  } catch (error) {
    // Someone else deleted it in the meantime: the list refreshes, no error.
    if (error instanceof HTTPError && error.response.status === 404) return
    throw error
  }
}
