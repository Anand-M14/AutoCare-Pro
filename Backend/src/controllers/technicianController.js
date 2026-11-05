import {
  startTechnicianService,
  completeTechnicianService,
  createTechnicianReport
} from "../services/technician/technicianService.js";


// ==========================================
// START SERVICE
// ==========================================

export const startService = async (req, res) => {

  try {

    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "Request ID is required"
      });
    }

    const result =
      await startTechnicianService(requestId);

    return res.status(200).json({
      success: true,
      message: "Service Started Successfully",
      data: result
    });

  } catch (error) {

    console.log(
      "Start Service Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ==========================================
// COMPLETE SERVICE
// ==========================================

export const completeService = async (req, res) => {

  try {

    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "Request ID is required"
      });
    }

    const result =
      await completeTechnicianService(requestId);

    return res.status(200).json({
      success: true,
      message: "Service Completed Successfully",
      data: result
    });

  } catch (error) {

    console.log(
      "Complete Service Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ==========================================
// SUBMIT REPORT
// ==========================================

export const submitTechnicianReport = async (
  req,
  res
) => {

  try {

    const { requestId } = req.params;

    const {
      technicianId,
      diagnosis,
      workDone,
      partsUsed,
      additionalNotes
    } = req.body;


    if (!requestId) {

      return res.status(400).json({
        success: false,
        message: "Request ID is required"
      });

    }


    if (!technicianId) {

      return res.status(400).json({
        success: false,
        message: "Technician ID is required"
      });

    }


    const result =
      await createTechnicianReport(
        requestId,
        technicianId,
        {
          diagnosis,
          workDone,
          partsUsed,
          additionalNotes
        }
      );


    return res.status(201).json({

      success: true,

      message:
        "Technician Report Submitted Successfully",

      data: result

    });

  } catch (error) {

    console.log(
      "Submit Technician Report Error:",
      error
    );

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }
};