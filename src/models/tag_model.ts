import "jxp/globals";
/* global JXPSchema */

const TAG_APPLICABLE_TYPES = ["reader", "article", "newsletter"] as const;
const DEFAULT_TAG_COLOR = "#3B82F6";

const TagSchema = new JXPSchema(
	{
		name: { type: String, unique: true, required: true, index: true, trim: true },
		color: { type: String, default: DEFAULT_TAG_COLOR, trim: true },
		applicable_types: {
			type: [String],
			enum: TAG_APPLICABLE_TYPES,
			default: ["reader"],
			index: true,
		},
		description: { type: String, trim: true },
	},
	{
		perms: {
			admin: "crud",
			owner: "crud",
			user: "r",
		},
	}
);

TagSchema.index({ applicable_types: 1, name: 1 });

const Tag = JXPSchema.model("tag", TagSchema);
export = Tag;
