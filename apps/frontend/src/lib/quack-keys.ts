export const quackKeys = {
  all: () => ["quacks"] as const,
  lists: () => [...quackKeys.all(), "list"] as const,
  list: (search?: string, isMine?: boolean) => [...quackKeys.lists(), { search, isMine }] as const,
}
