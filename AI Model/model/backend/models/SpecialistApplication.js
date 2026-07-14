const mongoose = require("mongoose");

const specialistApplicationSchema =
new mongoose.Schema(
{
    firstName:{
        type:String,
        required:true
    },

    lastName:{
        type:String,
        required:true
    },

    email:{
        type:String,
        required:true,
        unique:true
    },

    password:{
        type:String,
        required:true
    },

    hospital:{
        type:String,
        required:true
    },

    specialization:{
        type:String,
        required:true
    },

    experience:{
        type:Number,
        required:true
    },

    status:{
        type:String,
        enum:[
            "pending",
            "approved",
            "rejected"
        ],
        default:"pending"
    },

    credentialKey:{
        type:String
    },

    credentialUrl:{
        type:String
    }
},
{
    timestamps:true
}
);

module.exports =
mongoose.model(
    "SpecialistApplication",
    specialistApplicationSchema
);