import { getAllLiabilities } from "@/lib/db/queries"
import { LiabilitiesList } from "./LiabilitiesList"

export async function LiabilitiesListAsync() {
  const liabilities = await getAllLiabilities()

  return <LiabilitiesList liabilities={liabilities} />
}
