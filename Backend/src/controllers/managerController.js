import {
  getManagerRequests,
  getAdvisors,
  assignAdvisor,
  getManagerReports,
  approveManagerReport
} from "../services/manager/managerService.js";


// =====================================================
// GET MANAGER REQUESTS
// =====================================================

export const managerRequests = async (
  req,
  res
) => {

  try {

    const requests =
      await getManagerRequests();

    return res.status(200).json({

      success: true,

      data: requests

    });

  } catch (error) {

    console.log(
      "Manager Requests Controller Error:",
      error
    );

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};


// =====================================================
// GET SERVICE ADVISORS
// =====================================================

export const managerAdvisors = async (
  req,
  res
) => {

  try {

    const advisors =
      await getAdvisors();

    return res.status(200).json({

      success: true,

      data: advisors

    });

  } catch (error) {

    console.log(
      "Manager Advisors Error:",
      error
    );

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};


// =====================================================
// ASSIGN ADVISOR
// =====================================================

export const assignAdvisorToRequest = async (
  req,
  res
) => {

  try {

    const {
      requestId
    } = req.params;


    const {
      advisor_id
    } = req.body;


    if (!advisor_id) {

      return res.status(400).json({

        success: false,

        message:
          "Advisor ID is required"

      });

    }


    const request =
      await assignAdvisor(
        requestId,
        advisor_id
      );


    return res.status(200).json({

      success: true,

      data: request,

      message:
        "Advisor Assigned Successfully"

    });

  } catch (error) {

    console.log(
      "Assign Advisor Controller Error:",
      error
    );

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};


// =====================================================
// GET MANAGER REPORTS
// =====================================================

export const managerReports = async (
  req,
  res
) => {

  try {

    const reports =
      await getManagerReports();


    return res.status(200).json({

      success: true,

      data: reports

    });

  } catch (error) {

    console.log(
      "Manager Reports Controller Error:",
      error
    );


    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};


// =====================================================
// APPROVE MANAGER REPORT
// =====================================================

export const approveReport = async (
  req,
  res
) => {

  try {

    const {
      requestId
    } = req.params;


    const {
      managerId
    } = req.body;


    if (!requestId) {

      return res.status(400).json({

        success: false,

        message:
          "Request ID is required"

      });

    }


    if (!managerId) {

      return res.status(400).json({

        success: false,

        message:
          "Manager ID is required"

      });

    }


    const result =
      await approveManagerReport(
        requestId,
        managerId
      );


    return res.status(200).json({

      success: true,

      message:
        "Report approved and sent to Admin",

      data: result

    });

  } catch (error) {

    console.log(
      "Manager Approve Report Controller Error:",
      error
    );


    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};