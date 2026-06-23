import "jxp/globals";
/* global JXPSchema */

const AiProviderSchema = new JXPSchema(
	{
		name: { type: String, index: true },
		baseUrl: { type: String },
		model: { type: String },
		apiKeyEnv: { type: String },
		enabled: { type: Boolean, index: true, default: true },
		isDefault: { type: Boolean, index: true, default: false },
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

AiProviderSchema.index({ isDefault: 1 });
AiProviderSchema.index({ enabled: 1 });

const AiProvider = JXPSchema.model("ai_providers", AiProviderSchema);
export = AiProvider;
