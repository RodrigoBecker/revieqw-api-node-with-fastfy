import { FastifyInstance } from "fastify";
import { knex } from "../database";
import { z } from 'zod'
import { randomUUID } from "node:crypto";
import { checkSessionIdExists } from "../middlewares/check-session-id-exist";


export async function transactionsRoutes(app: FastifyInstance) {

  app.addHook('preHandler', async (request, reply) => {
    console.log(`[${request.method}] ${request.url}`)
  })

  app.get('/', {
    preHandler: [checkSessionIdExists]
  }, async (request, reply) => {

    const { sessionId } = request.cookies
    const transactions = await knex('transactions')
      .where('session_id', sessionId)
      .select()

    return {
      transactions,
    }
  })

  app.get('/:id', {
    preHandler: [checkSessionIdExists]
  }, async (request, reply) => {
    const { sessionId } = request.cookies
    const getTransactionParamsSchema = z.object({
      id: z.string().uuid()
    })

    const { id } = getTransactionParamsSchema.parse(request.params)

    const transactions = await knex('transactions')
      .where({
        id,
        session_id: sessionId
      })
      .first()


    return {
      transactions
    }
  })


  app.get('/summary', {
    preHandler: [checkSessionIdExists]
  }, async (request, reply) => {
    const { sessionId } = request.cookies
    const summary = await knex('transactions')
      .where('session_id', sessionId)
      .sum('amount', { as: 'amount' })
      .first()
    return { summary }
  })


  app.post('/', async (request, reply) => {
    // const transaction = await knex('transactions').insert({
    //   id: crypto.randomUUID(),
    //   title: 'Transaction Testing',
    //   amount: 1000,
    // }).returning('*')
    //

    //const transaction = await knex('transactions').select('*')

    // const transaction = await knex('transactions').select('*')
    //   .where('amount', 500)
    //
    //

    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit'])
    })

    const { title, amount, type } = createTransactionBodySchema.parse(request.body)

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()
      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7 //seven days
      })
    }

    await knex('transactions')
      .insert({
        id: randomUUID(),
        title,
        amount: type === 'credit' ? amount : amount * -1.,
        session_id: sessionId
      })

    // 201 status code

    return reply.status(201).send()
  })

}
