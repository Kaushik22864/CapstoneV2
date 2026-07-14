// backend/models/UserModel.js
//
// Adapter that lets the shared authentication.middleware.js treat
// "Admin" and "Specialist" as if they were one unified User model.

const Admin = require("./Admin");
const Specialist = require("./Specialist");

async function findUserById(id) {
  const admin = await Admin.findById(id).lean();
  if (admin) {
    return {
      _id: admin._id,
      role: "Admin",
      status: "Approved",
    };
  }

  const specialist = await Specialist.findById(id).lean();
  if (specialist) {
    return {
      _id: specialist._id,
      role: "Doctor",
      status: specialist.verified && specialist.isActive ? "Approved" : "Unverified",
    };
  }

  return null;
}

function findById(id) {
  const query = {
    select() {
      return this;
    },
    lean() {
      return this;
    },
    then(resolve, reject) {
      return findUserById(id).then(resolve, reject);
    },
    catch(reject) {
      return findUserById(id).catch(reject);
    },
  };
  return query;
}

async function exists(filter) {
  const id = filter._id;
  const user = await findUserById(id);
  return !!user;
}

module.exports = { findById, exists };