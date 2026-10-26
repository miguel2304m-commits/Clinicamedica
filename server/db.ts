import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
export const db = new PrismaClient();
export type Tx = Prisma.TransactionClient;
export class Erro extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function exigir(
  condicao: unknown,
  mensagem: string,
  status = 422,
): asserts condicao {
  if (!condicao) throw new Erro(status, mensagem);
}
export async function transacao<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let tentativa = 0; ; tentativa++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: "Serializable",
        timeout: 15000,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2034" &&
        tentativa < 3
      )
        continue;
      throw e;
    }
  }
}
