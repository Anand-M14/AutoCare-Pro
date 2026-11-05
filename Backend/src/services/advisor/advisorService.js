import supabase from "../../config/supabase.js";

// =====================================================
// GET ADVISOR REQUESTS
// =====================================================

export const getAdvisorRequests = async (advisorId) => {

  if (!advisorId) {

    throw new Error(
      "Advisor ID is required"
    );

  }

  console.log(
    "Loading requests for advisor:",
    advisorId
  );

  // ===================================================
  // GET REQUESTS ASSIGNED TO THIS ADVISOR
  // ===================================================

  const {
    data: requests,
    error: requestError
  } = await supabase

    .from("service_requests")

    .select("*")

    .eq(
      "advisor_id",
      advisorId
    )

    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (requestError) {

    console.log(
      "Advisor Requests Supabase Error:",
      requestError
    );

    throw requestError;

  }

  console.log(
    "Advisor Requests:",
    requests
  );

  if (
    !requests ||
    requests.length === 0
  ) {

    return [];

  }

  // ===================================================
  // GET CUSTOMER / VEHICLE / TECHNICIAN DETAILS
  // ===================================================

  const finalData =
    await Promise.all(

      requests.map(
        async (request) => {

          // =========================================
          // CUSTOMER
          // =========================================

          let customer = null;

          if (request.customer_id) {

            const {
              data,
              error
            } = await supabase

              .from("users")

              .select(
                "id, full_name, phone"
              )

              .eq(
                "id",
                request.customer_id
              )

              .maybeSingle();

            if (!error) {

              customer = data;

            }

          }

          // =========================================
          // VEHICLE
          // =========================================

          let vehicle = null;

          if (request.vehicle_id) {

            const {
              data,
              error
            } = await supabase

              .from("vehicles")

              .select(
                "id, brand, model, registration_number"
              )

              .eq(
                "id",
                request.vehicle_id
              )

              .maybeSingle();

            if (!error) {

              vehicle = data;

            }

          }

          // =========================================
          // TECHNICIAN
          // =========================================

          let technician = null;

          if (request.technician_id) {

            const {
              data,
              error
            } = await supabase

              .from("users")

              .select(
                "id, full_name"
              )

              .eq(
                "id",
                request.technician_id
              )

              .maybeSingle();

            if (!error) {

              technician = data;

            }

          }

          // =========================================
          // FINAL REQUEST
          // =========================================

          return {

            ...request,

            customer,

            vehicle,

            technician

          };

        }
      )

    );

  return finalData;

};

// =====================================================
// GET TECHNICIANS
// =====================================================

export const getAdvisorTechnicians = async () => {

  console.log(
    "Loading technicians..."
  );

  const {
    data: technicians,
    error
  } = await supabase

    .from("users")

    .select(
      "id, full_name, phone"
    )

    .eq(
      "role",
      "Technician"
    )

    .order(
      "full_name",
      {
        ascending: true
      }
    );

  if (error) {

    console.log(
      "Get Technicians Error:",
      error
    );

    throw error;

  }

  return technicians || [];

};

// =====================================================
// ASSIGN TECHNICIAN
// =====================================================

export const assignAdvisorTechnician = async (
  requestId,
  technicianId
) => {

  if (!requestId) {

    throw new Error(
      "Request ID is required"
    );

  }

  if (!technicianId) {

    throw new Error(
      "Technician ID is required"
    );

  }

  console.log(
    "Assigning technician:",
    {
      requestId,
      technicianId
    }
  );

  // ===================================================
  // CHECK REQUEST
  // ===================================================

  const {
    data: request,
    error: requestError
  } = await supabase

    .from("service_requests")

    .select(`
      id,
      request_number,
      advisor_id,
      technician_id,
      request_status
    `)

    .eq(
      "id",
      requestId
    )

    .maybeSingle();

  if (requestError) {

    console.log(
      "Request Check Error:",
      requestError
    );

    throw requestError;

  }

  if (!request) {

    throw new Error(
      "Service request not found"
    );

  }

  // ===================================================
  // CHECK TECHNICIAN
  // ===================================================

  const {
    data: technician,
    error: technicianError
  } = await supabase

    .from("users")

    .select(
      "id, full_name, role"
    )

    .eq(
      "id",
      technicianId
    )

    .maybeSingle();

  if (technicianError) {

    console.log(
      "Technician Check Error:",
      technicianError
    );

    throw technicianError;

  }

  if (!technician) {

    throw new Error(
      "Technician not found"
    );

  }

  // ===================================================
  // UPDATE REQUEST
  // ===================================================

  const {
    data: updatedRequest,
    error: updateError
  } = await supabase

    .from("service_requests")

    .update({

      technician_id:
        technicianId,

      request_status:
        "Technician Assigned"

    })

    .eq(
      "id",
      requestId
    )

    .select()

    .single();

  if (updateError) {

    console.log(
      "Assign Technician Update Error:",
      updateError
    );

    throw updateError;

  }

  console.log(
    "Technician Assigned:",
    updatedRequest
  );

  return updatedRequest;

};

// =====================================================
// GET TECHNICIAN REPORTS FOR ADVISOR
// =====================================================

export const getAdvisorReports = async (
  advisorId
) => {

  if (!advisorId) {

    throw new Error(
      "Advisor ID is required"
    );

  }

  console.log(
    "Loading reports for advisor:",
    advisorId
  );

  // ===================================================
  // GET REPORT SUBMITTED REQUESTS
  // ===================================================

  const {
    data: requests,
    error: requestError
  } = await supabase

    .from("service_requests")

    .select("*")

    .eq(
      "advisor_id",
      advisorId
    )

    .eq(
      "request_status",
      "Report Submitted"
    )

    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (requestError) {

    console.log(
      "Advisor Requests Error:",
      requestError
    );

    throw requestError;

  }

  console.log(
    "Report Submitted Requests:",
    requests
  );

  if (
    !requests ||
    requests.length === 0
  ) {

    return [];

  }

  // ===================================================
  // GET DETAILS
  // ===================================================

  const finalData =
    await Promise.all(

      requests.map(
        async (request) => {

          // =========================================
          // CUSTOMER
          // =========================================

          let customer = null;

          if (request.customer_id) {

            const {
              data,
              error
            } = await supabase

              .from("users")

              .select(
                "id, full_name, phone"
              )

              .eq(
                "id",
                request.customer_id
              )

              .maybeSingle();

            if (!error) {

              customer = data;

            }

          }

          // =========================================
          // VEHICLE
          // =========================================

          let vehicle = null;

          if (request.vehicle_id) {

            const {
              data,
              error
            } = await supabase

              .from("vehicles")

              .select(
                "id, brand, model, registration_number"
              )

              .eq(
                "id",
                request.vehicle_id
              )

              .maybeSingle();

            if (!error) {

              vehicle = data;

            }

          }

          // =========================================
          // TECHNICIAN
          // =========================================

          let technician = null;

          if (request.technician_id) {

            const {
              data,
              error
            } = await supabase

              .from("users")

              .select(
                "id, full_name"
              )

              .eq(
                "id",
                request.technician_id
              )

              .maybeSingle();

            if (!error) {

              technician = data;

            }

          }

          // =========================================
          // TECHNICIAN REPORT
          // =========================================

          let report = null;

          const {
            data: reportData,
            error: reportError
          } = await supabase

            .from("technician_reports")

            .select(`
              id,
              request_id,
              technician_id,
              diagnosis,
              work_done,
              parts_used,
              additional_notes,
              created_at,
              updated_at
            `)

            .eq(
              "request_id",
              request.id
            )

            .order(
              "created_at",
              {
                ascending: false
              }
            )

            .limit(1)

            .maybeSingle();

          if (reportError) {

            console.log(
              "Technician Report Error:",
              reportError
            );

          } else {

            report =
              reportData;

          }

          // =========================================
          // FINAL
          // =========================================

          return {

            ...request,

            customer,

            vehicle,

            technician,

            report

          };

        }
      )

    );

  console.log(
    "Final Advisor Reports:",
    finalData
  );

  return finalData;

};

// =====================================================
// VERIFY TECHNICIAN REPORT
// =====================================================

export const verifyAdvisorReport = async (
  requestId,
  advisorId
) => {

  if (!requestId) {

    throw new Error(
      "Request ID is required"
    );

  }

  if (!advisorId) {

    throw new Error(
      "Advisor ID is required"
    );

  }

  console.log(
    "Verifying report:",
    requestId
  );

  // ===================================================
  // CHECK REQUEST
  // ===================================================

  const {
    data: request,
    error: requestError
  } = await supabase

    .from("service_requests")

    .select(`
      id,
      request_number,
      advisor_id,
      technician_id,
      request_status
    `)

    .eq(
      "id",
      requestId
    )

    .eq(
      "advisor_id",
      advisorId
    )

    .maybeSingle();

  if (requestError) {

    console.log(
      "Request Check Error:",
      requestError
    );

    throw requestError;

  }

  if (!request) {

    throw new Error(
      "Request not found or this request is not assigned to this advisor"
    );

  }

  // ===================================================
  // CHECK STATUS
  // ===================================================

  if (
    request.request_status !==
    "Report Submitted"
  ) {

    throw new Error(
      `Report cannot be verified. Current status: ${request.request_status}`
    );

  }

  // ===================================================
  // UPDATE STATUS
  // ===================================================

  const {
    data: updatedRequest,
    error: updateError
  } = await supabase

    .from("service_requests")

    .update({

      request_status:
        "Advisor Verified"

    })

    .eq(
      "id",
      requestId
    )

    .eq(
      "advisor_id",
      advisorId
    )

    .select()

    .maybeSingle();

  if (updateError) {

    console.log(
      "Verify Report Update Error:",
      updateError
    );

    throw updateError;

  }

  if (!updatedRequest) {

    throw new Error(
      "Could not update request status"
    );

  }

  console.log(
    "Advisor Verified Request:",
    updatedRequest
  );

  return updatedRequest;

};