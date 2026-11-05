import supabase from "../../config/supabase.js";

// =====================================================
// GET APPROVED REQUESTS FOR MANAGER
// =====================================================

export const getManagerRequests = async () => {

  const {
    data: requests,
    error
  } = await supabase
    .from("service_requests")
    .select("*")
    .eq("request_status", "Approved")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.log(
      "Manager Requests Supabase Error:",
      error
    );

    throw error;
  }

  if (!requests || requests.length === 0) {
    return [];
  }

  const finalData = await Promise.all(

    requests.map(async (request) => {

      // ==========================================
      // CUSTOMER
      // ==========================================

      let customer = null;

      if (request.customer_id) {

        const {
          data,
          error
        } = await supabase
          .from("users")
          .select("id, full_name, phone")
          .eq("id", request.customer_id)
          .maybeSingle();

        if (!error) {
          customer = data;
        }
      }


      // ==========================================
      // VEHICLE
      // ==========================================

      let vehicle = null;

      if (request.vehicle_id) {

        const {
          data,
          error
        } = await supabase
          .from("vehicles")
          .select(`
            id,
            brand,
            model,
            registration_number
          `)
          .eq("id", request.vehicle_id)
          .maybeSingle();

        if (!error) {
          vehicle = data;
        }
      }


      // ==========================================
      // ADVISOR
      // ==========================================

      let advisor = null;

      if (request.advisor_id) {

        const {
          data,
          error
        } = await supabase
          .from("users")
          .select("id, full_name")
          .eq("id", request.advisor_id)
          .maybeSingle();

        if (!error) {
          advisor = data;
        }
      }


      return {
        ...request,
        customer,
        vehicle,
        advisor
      };

    })

  );

  return finalData;
};


// =====================================================
// GET SERVICE ADVISORS
// =====================================================

export const getAdvisors = async () => {

  const {
    data,
    error
  } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "Service Advisor")
    .order("full_name");

  if (error) {

    console.log(
      "Advisor Error:",
      error
    );

    throw error;
  }

  return data || [];
};


// =====================================================
// ASSIGN ADVISOR
// =====================================================

export const assignAdvisor = async (
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

  const {
    data,
    error
  } = await supabase
    .from("service_requests")
    .update({
      advisor_id: advisorId,
      request_status: "Advisor Assigned"
    })
    .eq("id", requestId)
    .select()
    .maybeSingle();

  if (error) {

    console.log(
      "Assign Advisor Error:",
      error
    );

    throw error;
  }

  if (!data) {
    throw new Error(
      "Request not found"
    );
  }

  return data;
};


// =====================================================
// GET MANAGER REPORTS
// =====================================================
// Advisor verified reports only
// =====================================================

export const getManagerReports = async () => {

  console.log(
    "Loading Advisor Verified Reports..."
  );

  const {
    data: requests,
    error: requestError
  } = await supabase
    .from("service_requests")
    .select("*")
    .eq(
      "request_status",
      "Advisor Verified"
    )
    .order("created_at", {
      ascending: false
    });

  if (requestError) {

    console.log(
      "Manager Reports Request Error:",
      requestError
    );

    throw requestError;
  }

  if (!requests || requests.length === 0) {
    return [];
  }


  const finalData = await Promise.all(

    requests.map(async (request) => {

      // ==========================================
      // CUSTOMER
      // ==========================================

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


      // ==========================================
      // VEHICLE
      // ==========================================

      let vehicle = null;

      if (request.vehicle_id) {

        const {
          data,
          error
        } = await supabase
          .from("vehicles")
          .select(`
            id,
            brand,
            model,
            registration_number
          `)
          .eq(
            "id",
            request.vehicle_id
          )
          .maybeSingle();

        if (!error) {
          vehicle = data;
        }
      }


      // ==========================================
      // ADVISOR
      // ==========================================

      let advisor = null;

      if (request.advisor_id) {

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
            request.advisor_id
          )
          .maybeSingle();

        if (!error) {
          advisor = data;
        }
      }


      // ==========================================
      // TECHNICIAN
      // ==========================================

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


      // ==========================================
      // TECHNICIAN REPORT
      // ==========================================

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
          "Manager Technician Report Error:",
          reportError
        );

      } else {

        report = reportData;

      }


      return {
        ...request,
        customer,
        vehicle,
        advisor,
        technician,
        report
      };

    })

  );


  console.log(
    "Final Manager Reports:",
    finalData
  );

  return finalData;
};


// =====================================================
// MANAGER APPROVE REPORT
// =====================================================

export const approveManagerReport = async (
  requestId,
  managerId
) => {

  if (!requestId) {

    throw new Error(
      "Request ID is required"
    );

  }


  if (!managerId) {

    throw new Error(
      "Manager ID is required"
    );

  }


  // ==========================================
  // CHECK REQUEST
  // ==========================================

  const {
    data: request,
    error: requestError
  } = await supabase
    .from("service_requests")
    .select(`
      id,
      request_number,
      manager_id,
      advisor_id,
      technician_id,
      request_status
    `)
    .eq(
      "id",
      requestId
    )
    .eq(
      "manager_id",
      managerId
    )
    .maybeSingle();


  if (requestError) {

    console.log(
      "Manager Request Check Error:",
      requestError
    );

    throw requestError;
  }


  if (!request) {

    throw new Error(
      "Request not found or not assigned to this manager"
    );

  }


  // ==========================================
  // STATUS CHECK
  // ==========================================

  if (
    request.request_status !==
    "Advisor Verified"
  ) {

    throw new Error(
      `Report cannot be approved. Current status: ${request.request_status}`
    );

  }


  // ==========================================
  // UPDATE STATUS
  // ==========================================

  const {
    data: updatedRequest,
    error: updateError
  } = await supabase
    .from("service_requests")
    .update({
      request_status:
        "Manager Approved"
    })
    .eq(
      "id",
      requestId
    )
    .eq(
      "manager_id",
      managerId
    )
    .select()
    .maybeSingle();


  if (updateError) {

    console.log(
      "Manager Approval Error:",
      updateError
    );

    throw updateError;
  }


  if (!updatedRequest) {

    throw new Error(
      "Could not update request"
    );

  }


  return updatedRequest;
};