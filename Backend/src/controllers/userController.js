import { getCustomerDetail, getUsers, getUsersPage, createUser, updateUserData, deleteUserData } from "../services/user/userService.js";

export const getAllUsers = async (req, res, next) => {
  try {
    const q = req.valid?.query || {};
    // Managers and advisors may only look up customers; only Admin sees staff accounts.
    if (req.user.role !== "Admin") q.group = "customers";
    if (q.page === undefined && req.user.role === "Admin") {
      return res.json({ success: true, data: await getUsers() }); // legacy: full list
    }
    const { rows, meta } = await getUsersPage({ ...q, page: q.page ?? 1 });
    res.json({ success: true, data: rows, meta });
  } catch (e) { next(e); }
};

export const addUser = async (req, res, next) => {
  try {
    const user = await createUser(req.valid.body);
    res.status(201).json({ success: true, data: user, message: "User Added Successfully" });
  } catch (e) { next(e); }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await updateUserData(req.valid.params.id, req.valid.body, req.user);
    res.json({ success: true, data: user, message: "User Updated Successfully" });
  } catch (e) { next(e); }
};

export const deleteUser = async (req, res, next) => {
  try {
    await deleteUserData(req.valid.params.id, req.user);
    res.json({ success: true, message: "User Deleted Successfully" });
  } catch (e) { next(e); }
};

export const getOneUser = async (req, res, next) => {
  try {
    res.json({ success: true, data: await getCustomerDetail(req.valid.params.id, { customersOnly: req.user.role !== "Admin" }) });
  } catch (e) { next(e); }
};
