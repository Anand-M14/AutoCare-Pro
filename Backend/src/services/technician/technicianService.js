import supabase from "../../config/supabase.js";


// ==========================================
// START SERVICE
// ==========================================

export const startTechnicianService = async (requestId) => {

  if (!requestId) {
    throw new Error("Request ID is required");
  }

  console.log("Starting service for:", requestId);

  const {
    data: request,
    error: requestError
  } = await supabase
    .from("service_requests")
    .select(`
      id,
      request_number,
      technician_id,
      advisor_id,
      request_status
    `)
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    console.log("Request Fetch Error:", requestError);
    throw requestError;
  }

  if (!request) {
    throw new Error("Request ID not found in service_requests");
  }

  if (!request.technician_id) {
    throw new Error("Technician is not assigned to this request");
  }

  if (request.request_status !== "Technician Assigned") {
    throw new Error(
      `Service cannot be started. Current status: ${request.request_status}`
    );
  }

  const {
    data: updatedRequest,
    error: updateError
  } = await supabase
    .from("service_requests")
    .update({
      request_status: "Service Started",
      service_started_at: new Date().toISOString()
    })
    .eq("id", requestId)
    .select()
    .maybeSingle();

  if (updateError) {
    console.log("Start Service Update Error:", updateError);
    throw updateError;
  }

  return updatedRequest;
};



// ==========================================
// COMPLETE SERVICE
// ==========================================

export const completeTechnicianService = async (
  requestId
) => {

  const {
    data,
    error
  } = await supabase

    .from("service_requests")

    .update({
      request_status: "Service Completed",
      service_completed_at:
        new Date().toISOString()
    })

    .eq("id", requestId)

    .eq(
      "request_status",
      "Service Started"
    )

    .select()

    .maybeSingle();


  if (error) {

    console.log(
      "Complete Service Supabase Error:",
      error
    );

    throw error;
  }


  if (!data) {

    throw new Error(
      "Request not found or service cannot be completed"
    );

  }


  return data;
};



// ==========================================
// CREATE TECHNICIAN REPORT
// ==========================================

export const createTechnicianReport = async (
  requestId,
  technicianId,
  reportData
) => {

  const {

    diagnosis,
    workDone,
    partsUsed,
    additionalNotes

  } = reportData;


  // ========================================
  // CHECK REQUEST
  // ========================================

  const {
    data: request,
    error: requestError
  } = await supabase

    .from("service_requests")

    .select(`
      id,
      technician_id,
      request_status
    `)

    .eq("id", requestId)

    .maybeSingle();


  if (requestError) {
    throw requestError;
  }


  if (!request) {

    throw new Error(
      "Service request not found"
    );

  }


  if (
    request.technician_id !==
    technicianId
  ) {

    throw new Error(
      "This request is not assigned to this technician"
    );

  }


  // ========================================
  // INSERT REPORT
  // ========================================

  const {
    data: report,
    error: reportError
  } = await supabase

    .from("technician_reports")

    .insert({

      request_id: requestId,

      technician_id: technicianId,

      diagnosis: diagnosis || null,

      work_done: workDone || null,

      parts_used: partsUsed || null,

      additional_notes:
        additionalNotes || null

    })

    .select()

    .single();


  if (reportError) {

    console.log(
      "Technician Report Insert Error:",
      reportError
    );

    throw reportError;
  }


  // ========================================
  // UPDATE REQUEST STATUS
  // ========================================

  const {
    data: updatedRequest,
    error: updateError
  } = await supabase

    .from("service_requests")

    .update({

      request_status:
        "Report Submitted"

    })

    .eq("id", requestId)

    .select()

    .single();


  if (updateError) {
    throw updateError;
  }


  return {

    request: updatedRequest,

    report

  };

};

// ==========================================
// LIST MY JOBS / READ MY REPORT
// ==========================================
export const listTechnicianRequests = async (technicianId) => {
  const { data, error } = await supabase
    .from("service_requests")
    .select("*, vehicle:vehicle_id ( registration_number, vehicle_type, brand, model ), customer:customer_id ( full_name, phone )")
    .eq("technician_id", technicianId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data || [];
};

export const getTechnicianReport = async (requestId, technicianId) => {
  const { data, error } = await supabase
    .from("technician_reports").select("*")
    .eq("request_id", requestId).eq("technician_id", technicianId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
};
