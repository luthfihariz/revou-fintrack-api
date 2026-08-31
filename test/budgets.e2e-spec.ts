import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import request from "supertest";

describe("Budgets (e2e)", () => {
  let app: INestApplication;
  let accessToken: string;
  let categoryId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    // register and get access token
    const email = `testuser_${Date.now()}@example.com`;
    const registerResponse = await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        email: email,
        password: "Password123!",
        name: "Test User",
      })
      .expect(201);

    accessToken = registerResponse.body.access_token;

    // retrieve the first category id available in the database to use for budget creation
    const categoryResponse = await request(app.getHttpServer())
        .get("/categories")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

    categoryId = categoryResponse.body[0].id;

  });

  

  afterAll(async () => {
    app.close();
  });

  it("creates a budget for an existing category", async () => {
    // payload
    const payload = {
      month: 8,
      year: 2026,
      limitAmount: 1500,
      categoryId: categoryId,
    };

    // send request
    const response = await request(app.getHttpServer())
      .post("/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(payload)
      .expect(201); // http status assertions

    // assertions
    expect(response.body).toMatchObject({
      categoryId,
      month: payload.month,
      year: payload.year,
      id: expect.any(Number),
      userId: expect.any(Number),
      limitAmount: "1500", // Prisma returns decimal as string
    });
  });

  it("deletes a budget owned by the current user", async () => {
    const payload = {
      month: 9,
      year: 2026,
      limitAmount: 1500,
      categoryId,
    };

    const createResponse = await request(app.getHttpServer())
      .post("/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    const budgetId = createResponse.body.id;

    const response = await request(app.getHttpServer())
      .delete(`/budgets/${budgetId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({ deleted: true, id: budgetId });

    const listResponse = await request(app.getHttpServer())
      .get("/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(listResponse.body.some((budget) => budget.id === budgetId)).toBe(false);
  });

  it("returns 404 when deleting a budget that does not exist", async () => {
    const response = await request(app.getHttpServer())
      .delete("/budgets/999999")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);

    expect(response.body.message).toContain("Budget 999999 not found");
  });

  it("returns 403 when deleting a budget owned by another user", async () => {
    const otherUserEmail = `otheruser_${Date.now()}@example.com`;
    const otherUserResponse = await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        email: otherUserEmail,
        password: "Password123!",
        name: "Other User",
      })
      .expect(201);

    const otherAccessToken = otherUserResponse.body.access_token;

    const createResponse = await request(app.getHttpServer())
      .post("/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        month: 10,
        year: 2026,
        limitAmount: 2000,
        categoryId,
      })
      .expect(201);

    const budgetId = createResponse.body.id;

    const response = await request(app.getHttpServer())
      .delete(`/budgets/${budgetId}`)
      .set("Authorization", `Bearer ${otherAccessToken}`)
      .expect(403);

    expect(response.body.message).toBe("You do not own this budget");
  });

  it("rejects unauthenticated requests", async () => {
    await request(app.getHttpServer())
      .post("/budgets")
      .send({
        month: 8,
        year: 2026,
        limitAmount: 1500,
        categoryId,
      })
      .expect(401);
  });

  it("returns 400 for missing required fields", async () => {
    await request(app.getHttpServer())
      .post("/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ month: 8, year: 2026 })
      .expect(400);
  });

  it("returns 400 for month outside valid range", async () => {
    await request(app.getHttpServer())
      .post("/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        month: 13,
        year: 2026,
        limitAmount: 1500,
        categoryId,
      })
      .expect(400);
  });

  it("returns 400 for non-positive amount", async () => {
    await request(app.getHttpServer())
      .post("/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        month: 8,
        year: 2026,
        limitAmount: 0,
        categoryId,
      })
      .expect(400);
  });

  it("returns 404 when the category does not exist", async () => {
    const payload = {
      month: 8,
      year: 2026,
      limitAmount: 1500,
      categoryId: 999999,
    };

    const response = await request(app.getHttpServer())
      .post("/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(payload)
      .expect(404);

    expect(response.body.message).toContain("Category 999999 not found");
  });
});
