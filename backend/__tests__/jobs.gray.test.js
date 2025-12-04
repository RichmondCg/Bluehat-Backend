const request = require("supertest");
const app = require("../index");
const Credential = require("../models/Credential");
const Worker = require("../models/Worker");
const Client = require("../models/Client");
const SkillCategory = require("../models/SkillCategory");
const Job = require("../models/Job");
const {
  mockCredentials,
  mockWorkerData,
  mockClientData,
  mockSkillCategory,
  initializeMockData,
} = require("./helpers/testData");
const { createTestUser } = require("./helpers/testHelpers");

describe("Jobs API - Gray Box", () => {
  let workerCookies;
  let clientCookies;
  let clientProfile;
  let category;

  beforeAll(async () => {
    await initializeMockData();
  });

  beforeEach(async () => {
    // Seed a category
    category = await SkillCategory.create(mockSkillCategory);

    // Create worker + login (test-only login)
    await createTestUser(Credential, Worker, mockWorkerData, "worker");
    const workerLogin = await request(app).post("/ver/test-login").send({
      email: mockCredentials.worker.email,
      password: mockCredentials.worker.password,
    });
    workerCookies = workerLogin.headers["set-cookie"]; 

    // Create client + login (client must be verified to post jobs)
    const { profile: clientProf } = await createTestUser(
      Credential,
      Client,
      { ...mockClientData, isVerified: true },
      "client"
    );
    clientProfile = clientProf;
    const clientLogin = await request(app).post("/ver/test-login").send({
      email: mockCredentials.client.email,
      password: mockCredentials.client.password,
    });
    clientCookies = clientLogin.headers["set-cookie"];
  });

  describe("G1 Worker Forbidden To Post", () => {
    it("should return 401 and not create a job when a worker posts", async () => {
      const payload = {
        description:
          "Basic job description with more than twenty characters.",
        price: 1200,
        location: "Quezon City",
        category: String(category._id),
      };

      const res = await request(app)
        .post("/jobs")
        .set("Cookie", workerCookies)
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("code", "CLIENT_AUTH_REQUIRED");

      // Ensure DB has no job created
      const jobs = await Job.find({ description: payload.description });
      expect(jobs.length).toBe(0);
    });
  });

  describe("G2 Client Can Post Job (fields set correctly)", () => {
    it("should create job and set owner, status, trimmed fields", async () => {
      const payload = {
        description: "   Clean and service split-type aircon unit.   ",
        price: 2500,
        location: "   QC, Metro Manila   ",
        category: String(category._id),
      };

      const res = await request(app)
        .post("/jobs")
        .set("Cookie", clientCookies)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("status", "open");
      expect(res.body.data).toHaveProperty("clientId");
      expect(String(res.body.data.clientId)).toBe(String(clientProfile._id));
      expect(res.body.data.description).toBe(
        "Clean and service split-type aircon unit."
      );
      expect(res.body.data.location).toBe("QC, Metro Manila");

      // Verify in DB too
      const jobInDb = await Job.findById(res.body.data._id);
      expect(String(jobInDb.clientId)).toBe(String(clientProfile._id));
      expect(jobInDb.status).toBe("open");
    });
  });
});
