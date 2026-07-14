const mongoose = require("mongoose");

const specialistSchema = new mongoose.Schema(
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

    verified:{
        type:Boolean,
        default:true
    },

    isActive: {
    type: Boolean,
    default: true
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
    "Specialist",
    specialistSchema
);