import "jxp/globals";
/* global JXPSchema */

const TestSchema = new JXPSchema({
    foo: String
},
    {
        perms: {
            admin: "crud",
            owner: "crud",
            user: "cr",
            all: "r"
        }
    });

const Test = JXPSchema.model('test', TestSchema);
export = Test;