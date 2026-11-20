const { find } = require("./find");
const { create } = require("./create");
const { update } = require("./update");
const { delete: customDelete } = require("./delete");

module.exports = {
    find,
    create,
    update,
    customDelete,
};
