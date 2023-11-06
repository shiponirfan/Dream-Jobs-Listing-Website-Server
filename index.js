const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-ujyuzy1-shard-00-00.pzomx9u.mongodb.net:27017,ac-ujyuzy1-shard-00-01.pzomx9u.mongodb.net:27017,ac-ujyuzy1-shard-00-02.pzomx9u.mongodb.net:27017/?ssl=true&replicaSet=atlas-lf5h1l-shard-0&authSource=admin&retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const jobCollection = client.db("dream-jobs").collection("all-jobs");
    const appliedJobCollection = client
      .db("dream-jobs")
      .collection("applied-jobs");
    // Get All Jobs
    app.get("/api/v1/jobs", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query.userEmail = email;
      }
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });
    // Single Job
    app.get("/api/v1/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });
    // Applied Jobs
    app.get("/api/v1/user/applied-job", async (req, res) => {
      const userEmail = req.query.email;
      const filter = { applyUserEmail: userEmail };
      const appliedUserDetails = await appliedJobCollection
        .find(filter)
        .toArray();
      const jobInformation = appliedUserDetails.map(
        (job) => job.jobInformationId
      );
      const query = {
        _id: { $in: jobInformation.map((id) => new ObjectId(id)) },
      };
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });
    // Post Jobs
    app.post("/api/v1/jobs", async (req, res) => {
      const jobs = req.body;
      const result = await jobCollection.insertOne(jobs);
      res.send(result);
    });
    // Post Applied Jobs
    app.post("/api/v1/user/applied-job", async (req, res) => {
      const appliedJob = req.body;
      const result = await appliedJobCollection.insertOne(appliedJob);
      res.send(result);
    });
    app.put("/api/v1/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const getUpdateJob = req.body;
      const updateJob = {
        $set: {
          jobTitle: getUpdateJob.jobUpdatedData.jobTitle,
          jobCategory: getUpdateJob.jobUpdatedData.jobCategory,
          userName: getUpdateJob.jobUpdatedData.userName,
          userEmail: getUpdateJob.jobUpdatedData.userEmail,
          pictureUrl: getUpdateJob.jobUpdatedData.pictureUrl,
          salaryRange: getUpdateJob.jobUpdatedData.salaryRange,
          jobPostingDate: getUpdateJob.jobUpdatedData.jobPostingDate,
          applicationDeadline: getUpdateJob.jobUpdatedData.applicationDeadline,
          jobApplicantsNumber: getUpdateJob.jobUpdatedData.jobApplicantsNumber,
          jobDescription: getUpdateJob.jobUpdatedData.jobDescription,
        },
      };
      const result = await jobCollection.updateOne(query, updateJob);
      res.send(result);
    });
    // Delete Jobs
    app.delete("/api/v1/user/delete-job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Dream Jobs Listing Website Server");
});
app.listen(port, () => {
  console.log(`Dream Jobs Listing Website Server Running On Port ${port}`);
});
