import "jxp/globals";
/* global JXPSchema */

const AiPromptTemplateSchema = new JXPSchema(
	{
		name: { type: String, index: true },
		slug: { type: String, index: true, unique: true },
		description: { type: String },
		systemPrompt: { type: String },
		mcpServerIds: { type: [String], default: [] },
		modelOverride: { type: String },
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

AiPromptTemplateSchema.index({ slug: 1 });
AiPromptTemplateSchema.index({ isDefault: 1 });
AiPromptTemplateSchema.index({ enabled: 1 });

const AiPromptTemplate = JXPSchema.model("ai_prompt_templates", AiPromptTemplateSchema);
export = AiPromptTemplate;
