const { getRankedApplications } = require("../services/application.service");

const getRankedCandidates = async (req, res) => {
  const applications = await getRankedApplications(req.params.jobId);
  res.json({ success: true, applications });
};

module.exports = getRankedCandidates;

const { updateApplicationStatus } = require("../services/application.service");

const updateStatus = async (req, res) => {
  const { status } = req.body;

  if (!["shortlisted", "rejected", "hired"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const application = await updateApplicationStatus(
    req.params.applicationId,
    status
  );

  res.json({ success: true, application });
};

module.exports = updateStatus;
