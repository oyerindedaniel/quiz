"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSeedingService = void 0;
const local_database_service_js_1 = require("../database/local-database-service.js");
const lib_js_1 = require("../../utils/lib.js");
const students_js_1 = require("../constants/students.js");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const remote_database_service_js_1 = require("../database/remote-database-service.js");
const uuid_1 = require("uuid");
class UserSeedingService {
    constructor(options = {}) {
        this.localDb = local_database_service_js_1.LocalDatabaseService.getInstance();
        this.remoteDb = remote_database_service_js_1.RemoteDatabaseService.getInstance();
        this.isRemote = options.isRemote || false;
    }
    generateUUID() {
        return (0, uuid_1.v4)();
    }
    async seedUsersFromCSV(csvData) {
        const users = this.parseUserCSV(csvData);
        const results = { created: 0, skipped: 0, errors: [] };
        for (const userData of users) {
            try {
                const existing = this.isRemote
                    ? await this.remoteDb.findUserByStudentCode(userData.studentCode)
                    : await this.localDb.findUserByStudentCode(userData.studentCode);
                if (existing) {
                    results.skipped++;
                    continue;
                }
                const passwordHash = await bcryptjs_1.default.hash(userData.pin, 10);
                await (this.isRemote
                    ? this.remoteDb.createUser({
                        id: this.generateUUID(),
                        name: userData.name,
                        studentCode: userData.studentCode,
                        passwordHash,
                        class: userData.class,
                        gender: userData.gender,
                    })
                    : this.localDb.createUser({
                        id: (0, lib_js_1.generateUUID)(),
                        name: userData.name,
                        studentCode: userData.studentCode,
                        passwordHash,
                        class: userData.class,
                        gender: userData.gender,
                    }));
                results.created++;
            }
            catch (error) {
                results.errors.push(`Failed to create user ${userData.studentCode}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }
        return results;
    }
    async createUserData() {
        const studentsWithPins = students_js_1.ALL_STUDENTS.map((student, index) => {
            const pin = String(100000 + (index + 1)).padStart(6, "1");
            return {
                name: student.name,
                studentCode: student.studentCode,
                pin: pin,
                class: student.class,
                gender: student.gender,
            };
        });
        const userCSV = this.generateUserCSV(studentsWithPins);
        const userResults = await this.seedUsersFromCSV(userCSV);
        return {
            users: userResults,
        };
    }
    getStudentCredentials() {
        return students_js_1.ALL_STUDENTS.map((student, index) => {
            const pin = String(100000 + (index + 1)).padStart(6, "1");
            return {
                name: student.name,
                studentCode: student.studentCode,
                pin: pin,
                class: student.class,
                gender: student.gender,
            };
        });
    }
    async createSubjectsData() {
        const { ALL_SUBJECTS } = await Promise.resolve().then(() => __importStar(require("../constants/students")));
        const result = {
            created: 0,
            existing: 0,
            errors: [],
        };
        for (const subjectData of ALL_SUBJECTS) {
            try {
                const existing = this.isRemote
                    ? await this.remoteDb.findSubjectByCode(subjectData.subjectCode)
                    : await this.localDb.findSubjectByCode(subjectData.subjectCode);
                if (existing) {
                    result.existing++;
                    continue;
                }
                await (this.isRemote
                    ? this.remoteDb.createSubject({
                        id: (0, uuid_1.v4)(),
                        name: subjectData.name,
                        subjectCode: subjectData.subjectCode,
                        description: subjectData.description,
                        class: subjectData.class,
                    })
                    : this.localDb.createSubject({
                        id: (0, uuid_1.v4)(),
                        name: subjectData.name,
                        subjectCode: subjectData.subjectCode,
                        description: subjectData.description,
                        class: subjectData.class,
                    }));
                result.created++;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                result.errors.push(`Failed to create subject ${subjectData.subjectCode}: ${errorMessage}`);
            }
        }
        return result;
    }
    parseUserCSV(csvData) {
        const lines = csvData.split("\n").filter((line) => line.trim());
        if (lines.length === 0)
            return [];
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        return lines
            .slice(1)
            .map((line) => {
            const values = line.split(",").map((v) => v.trim());
            return {
                name: values[headers.indexOf("name")] || "",
                studentCode: values[headers.indexOf("student_code")] || "",
                pin: values[headers.indexOf("pin")] || "",
                class: values[headers.indexOf("class")] || "SS2",
                gender: values[headers.indexOf("gender")] || "MALE",
            };
        })
            .filter((user) => user.name && user.studentCode && user.pin && user.class && user.gender);
    }
    generateUserCSV(users) {
        const headers = ["name", "student_code", "pin", "class", "gender"];
        const rows = users.map((user) => [user.name, user.studentCode, user.pin, user.class, user.gender].join(","));
        return [headers.join(","), ...rows].join("\n");
    }
}
exports.UserSeedingService = UserSeedingService;
