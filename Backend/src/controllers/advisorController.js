import {
  getAdvisorReports,
  verifyAdvisorReport,

  // REQUEST SERVICES
  getAdvisorRequests,
  getAdvisorTechnicians,
  assignAdvisorTechnician
} from "../services/advisor/advisorService.js";

// =====================================================
// GET ADVISOR REQUESTS
// =====================================================

export const advisorRequests = async (req, res) => {
  try {

    const { advisorId } = req.query;

    console.log(
      "Advisor Request - Advisor ID:",
      advisorId
    );

    if (!advisorId) {

      return res.status(400).json({
        success: false,
        message: "Advisor ID is required"
      });

    }

    const requests =
      await getAdvisorRequests(advisorId);

    return res.status(200).json({
      success: true,
      data: requests
    });

  } catch (error) {

    console.log(
      "Advisor Requests Controller Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

// =====================================================
// GET TECHNICIANS
// =====================================================

export const advisorTechnicians = async (req, res) => {

  try {

    const technicians =
      await getAdvisorTechnicians();

    return res.status(200).json({
      success: true,
      data: technicians
    });

  } catch (error) {

    console.log(
      "Advisor Technicians Controller Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

// =====================================================
// ASSIGN TECHNICIAN
// =====================================================

export const assignTechnician = async (req, res) => {

  try {

    const { requestId } = req.params;

    const { technician_id } = req.body;

    console.log(
      "Assign Technician Request:",
      {
        requestId,
        technician_id
      }
    );

    if (!requestId) {

      return res.status(400).json({
        success: false,
        message: "Request ID is required"
      });

    }

    if (!technician_id) {

      return res.status(400).json({
        success: false,
        message: "Technician ID is required"
      });

    }

    const updatedRequest =
      await assignAdvisorTechnician(
        requestId,
        technician_id
      );

    return res.status(200).json({

      success: true,

      message:
        "Technician Assigned Successfully",

      data: updatedRequest

    });

  } catch (error) {

    console.log(
      "Assign Technician Controller Error:",
      error
    );

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

// =====================================================
// GET TECHNICIAN REPORTS FOR ADVISOR
// =====================================================

export const advisorReports = async (req, res) => {

  try {

    const { advisorId } = req.query;

    console.log(
      "Advisor ID From Request:",
      advisorId
    );

    if (!advisorId) {

      return res.status(400).json({

        success: false,

        message: "Advisor ID is required"

      });

    }

    const reports =
      await getAdvisorReports(advisorId);

    return res.status(200).json({

      success: true,

      data: reports

    });

  } catch (error) {

    console.log(
      "Advisor Reports Controller Error:",
      error
    );

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

// =====================================================
// VERIFY TECHNICIAN REPORT
// =====================================================

export const verifyReport = async (req, res) => {

  try {

    const { requestId } = req.params;

    const { advisorId } = req.body;

    console.log(
      "Verify Report Request:",
      {
        requestId,
        advisorId
      }
    );

    if (!requestId) {

      return res.status(400).json({

        success: false,

        message: "Request ID is required"

      });

    }

    if (!advisorId) {

      return res.status(400).json({

        success: false,

        message: "Advisor ID is required"

      });

    }

    const updatedRequest =
      await verifyAdvisorReport(
        requestId,
        advisorId
      );

    return res.status(200).json({

      success: true,

      message:
        "Technician Report Verified Successfully",

      data: updatedRequest

    });

  } catch (error) {

    console.log(
      "Verify Report Controller Error:",
      error
    );

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};