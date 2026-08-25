import { ValidationPipe } from "@nestjs/common";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

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

    const email = `budgets-e2e-${Date.now()}@example.com`;
    const authResponse = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ name: "Budgets E2E User", email, password: "password123" })
      .expect(201);

    accessToken = authResponse.body.access_token;

    const categoriesResponse = await request(app.getHttpServer())
      .get("/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    categoryId = categoriesResponse.body[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a budget and includes its category", async () => {
    const payload = {
      categoryId,
      month: 8,
      year: 2026,
      limitAmount: "250000.5",
    };

    const response = await request(app.getHttpServer())
      .post("/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        categoryId,
        month: payload.month,
        year: payload.year,
        limitAmount: "250000.5",
        category: expect.objectContaining({ id: categoryId }),
      }),
    );
    expect(response.body.id).toEqual(expect.any(Number));
    expect(response.body.userId).toEqual(expect.any(Number));
  });

  it("rejects unauthenticated requests", () => {
    return request(app.getHttpServer())
      .post("/budgets")
      .send({ categoryId, month: 8, year: 2026, limitAmount: 100000 })
      .expect(401);
  });

  it("rejects invalid budget fields", () => {
    return request(app.getHttpServer())
      .post("/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ categoryId, month: 13, year: 1999, limitAmount: 0 })
      .expect(400);
  });

  it("rejects a budget for a category that does not exist", () => {
    return request(app.getHttpServer())
      .post("/budgets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: 999999999,
        month: 8,
        year: 2026,
        limitAmount: 100000,
      })
      .expect(404);
  });
});
