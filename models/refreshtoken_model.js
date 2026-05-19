/* global JXPSchema ObjectId */
const env = require("../lib/env");

var RefreshTokenSchema = new JXPSchema({
    user_id: { type: ObjectId, index: true },
    refresh_token: { type: String, index: true },
    expires_in: { type: Number, default: env.refreshTokenExpiry },
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "",
    }
});

RefreshTokenSchema.index({ "expire_at": 1 }, { expireAfterSeconds: env.refreshTokenExpiry });

const RefreshToken = JXPSchema.model('RefreshToken', RefreshTokenSchema);
module.exports = RefreshToken;