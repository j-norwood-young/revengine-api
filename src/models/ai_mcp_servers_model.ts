import "jxp/globals";
/* global JXPSchema */

const AiMcpServerSchema = new JXPSchema(
	{
		name: { type: String, index: true },
		slug: { type: String, index: true, unique: true },
		transport: { type: String, default: "http" },
		url: { type: String },
		headerEnvMap: { type: Object },
		enabled: { type: Boolean, index: true, default: true },
		builtin: { type: Boolean, default: false },
		createdAt: { type: Date, index: true },
		updatedAt: { type: Date, index: true }
	},
	{
		perms: {
			admin: "crud",
			owner: "",
			user: "",
			all: ""
		}
	}
);

AiMcpServerSchema.index({ slug: 1 });
AiMcpServerSchema.index({ enabled: 1 });

const AiMcpServer = JXPSchema.model("ai_mcp_servers", AiMcpServerSchema);
export = AiMcpServer;
