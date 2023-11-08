const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "https://dream-jobs-76f13.web.app",
      "https://dreamjobslisting.netlify.app",
    ],
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pzomx9u.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// JWT Middleware
const verifyJwtToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    req.userJwt = decoded;
    next();
  });
};

async function run() {
  try {
    await client.connect();

    const jobCollection = client.db("dream-jobs").collection("all-jobs");
    const appliedJobCollection = client
      .db("dream-jobs")
      .collection("applied-jobs");

    // JWT Token
    app.post("/api/v1/auth/access-token", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_KEY, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });
    // JWT Token Cancel
    app.post("/api/v1/auth/access-cancel", async (req, res) => {
      const user = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // Get All Jobs
    app.get("/api/v1/jobs", async (req, res) => {
      let query = {};

      // Filter By Job Types
      const jobCategory = req.query.jobCategory;
      if (jobCategory) {
        query.jobCategory = jobCategory;
      }

      // Searchfield
      const jobTitle = req.query.jobTitle;
      if (jobTitle) {
        query.jobTitle = { $regex: jobTitle, $options: "i" };
      }

      // Sort By Salary Range
      const sort = req.query.sort;
      const sortValue = {};
      if (sort) {
        sortValue.salaryRange = sort;
      }

      // Pagination Options
      const pages = parseInt(req.query.pages);
      const limit = parseInt(req.query.limit);
      const skip = (pages - 1) * limit;

      const result = await jobCollection
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort(sortValue)
        .toArray();

      // Total Number Of Pages
      const totalPagesCount = await jobCollection.countDocuments();

      res.send({ result, totalPagesCount });
    });

    // My Jobs
    app.get("/api/v1/my-jobs", verifyJwtToken, async (req, res) => {
      let query = {};

      if (req.query.email !== req.userJwt.email) {
        return res.status(403).send({ message: "Forbidden" });
      }

      // Check User Email
      const email = req.query.email;
      if (email) {
        query.userEmail = email;
      }

      // Filter By Job Types
      const jobCategory = req.query.jobCategory;
      if (jobCategory) {
        query.jobCategory = jobCategory;
      }

      // Searchfield
      const jobTitle = req.query.jobTitle;
      if (jobTitle) {
        query.jobTitle = { $regex: jobTitle, $options: "i" };
      }

      // Sort By Salary Range
      const sort = req.query.sort;
      const sortValue = {};
      if (sort) {
        sortValue.salaryRange = sort;
      }

      // Pagination Options
      const pages = parseInt(req.query.pages);
      const limit = parseInt(req.query.limit);
      const skip = (pages - 1) * limit;

      const result = await jobCollection
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort(sortValue)
        .toArray();

      // Total Number Of Pages
      const totalPagesCount = await jobCollection.countDocuments();

      res.send({ result, totalPagesCount });
    });

    // Single Job
    app.get("/api/v1/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    // Applied Jobs
    app.get("/api/v1/user/applied-job", verifyJwtToken, async (req, res) => {
      try {
        if (req.query.email !== req.userJwt.email) {
          return res.status(403).send({ message: "Forbidden" });
        }
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

        const jobCategory = req.query.jobCategory;
        if (jobCategory) {
          query.jobCategory = jobCategory;
        }
        const sort = req.query.sort;
        const sortValue = {};
        if (sort) {
          sortValue.salaryRange = sort;
        }

        const result = await jobCollection
          .find(query)
          .sort(sortValue)
          .toArray();

        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error" });
      }
    });

    // Post Jobs
    app.post("/api/v1/jobs", async (req, res) => {
      const jobs = req.body;
      const jobApplicantConvertToInteger = { ...jobs };
      jobApplicantConvertToInteger.jobApplicantsNumber = parseInt(
        jobs.jobApplicantsNumber
      );
      const result = await jobCollection.insertOne(
        jobApplicantConvertToInteger
      );
      res.send(result);
    });

    // Post Applied Jobs
    app.post("/api/v1/user/applied-job", async (req, res) => {
      const appliedJob = req.body;
      const result = await appliedJobCollection.insertOne(appliedJob);
      res.send(result);
    });

    // Job Update
    app.put("/api/v1/job/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const getUpdateJob = req.body;
        const convertNumber = parseInt(
          getUpdateJob.jobUpdatedData.jobApplicantsNumber
        );
        const updateJob = {
          $set: {
            jobTitle: getUpdateJob.jobUpdatedData.jobTitle,
            jobCategory: getUpdateJob.jobUpdatedData.jobCategory,
            userName: getUpdateJob.jobUpdatedData.userName,
            userEmail: getUpdateJob.jobUpdatedData.userEmail,
            pictureUrl: getUpdateJob.jobUpdatedData.pictureUrl,
            salaryRange: getUpdateJob.jobUpdatedData.salaryRange,
            jobPostingDate: getUpdateJob.jobUpdatedData.jobPostingDate,
            applicationDeadline:
              getUpdateJob.jobUpdatedData.applicationDeadline,
            jobApplicantsNumber: convertNumber,
            jobDescription: getUpdateJob.jobUpdatedData.jobDescription,
          },
        };
        const result = await jobCollection.updateOne(query, updateJob);
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .json({ message: "An error occurred while updating the job" });
      }
    });

    // Applicant Count Update
    app.post("/api/v1/job/update-applicant-count", async (req, res) => {
      const getUpdateJob = req.body;
      const query = { _id: new ObjectId(getUpdateJob.applicantCount) };
      const updateJob = {
        $inc: {
          jobApplicantsNumber: 1,
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
    // await client.db("admin").command({ ping: 1 });
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
