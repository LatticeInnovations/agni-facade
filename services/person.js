let { checkEmptyData } = require("./CheckEmpty");

class Person {
    personObj;
    fhirResource;
    constructor(personObj, fhirResource) {
        this.personObj = personObj;
        this.fhirResource = fhirResource;
    }

    setBasicStructure() {
        this.fhirResource.identifier = [];
        this.fhirResource.name = [];
        this.fhirResource.link = [];
        this.fhirResource.telecom = [];
        this.fhirResource.address = [];
        this.fhirResource.link = [];
    }

    setIdAsIdentifier() {
        if (this.personObj.id) {
            let jsonObj = this.setIdentifierJSON({
                "identifierType": "urn:uuid:" + this.personObj.id,
                "identifierNumber": this.personObj.id,
                "code": "MR"
            })
            this.fhirResource.identifier.push(jsonObj)
        }
    }

    setFirstName() {
        let firstName = this.personObj.firstName;
        if (!checkEmptyData(firstName)) {
            let length = this.fhirResource.name.length
            this.fhirResource.name[length] = {};
            this.fhirResource.name[length].given = [];
            this.fhirResource.name[length].given.push(firstName);
        }

    }

    patchFirstName(fetchedData) {
        let isEmpty = checkEmptyData(fetchedData.name);
        if (!checkEmptyData(this.personObj.firstName) && !isEmpty) {
            this.fhirResource.push({ "op": this.personObj.firstName.operation, "path": "/name/0/given/0", "value": this.personObj.firstName.value });
        }
    }

    getFirstName() {
        if (this.fhirResource.name && !checkEmptyData(this.fhirResource.name[this.fhirResource.name.length - 1].given[0])) {
            this.personObj.firstName = this.fhirResource.name[this.fhirResource.name.length - 1].given[0]
        }
    }

    setLastName() {
        let lastName = this.personObj.lastName;
        if (!checkEmptyData(lastName)) {
            let length = this.fhirResource.name.length > 0 ? this.fhirResource.name.length - 1 : 0;
            this.fhirResource.name[length].family = lastName;
        }

    }

    patchLastName(fetchedData) {
        let isEmpty = checkEmptyData(fetchedData.name);
        if (!checkEmptyData(this.personObj.lastName) && !isEmpty)
            this.fhirResource.push({ "op": this.personObj.lastName.operation, "path": "/name/0/family", "value": this.personObj.lastName.value })
    }

    getLastName() {
        if (this.fhirResource.name && !checkEmptyData(this.fhirResource.name[this.fhirResource.name.length - 1].family)) {
            this.personObj.lastName = this.fhirResource.name[this.fhirResource.name.length - 1].family
        }
    }

    setMiddleName() {
        if (!checkEmptyData(this.personObj.middleName)) {
            let length = this.fhirResource.name.length;
            this.fhirResource.name[length - 1].given.push(this.personObj.middleName);
        }

    }

    patchMiddleName(fetchedData) {
        let isEmpty = checkEmptyData(fetchedData.name);
        if (!checkEmptyData(this.personObj.middleName) && !isEmpty)
            this.fhirResource.push({ "op": this.personObj.middleName.operation, "path": "/name/0/given/1", "value": this.personObj.middleName.value })
    }


    getMiddleName() {
        if (this.fhirResource.name && !checkEmptyData(this.fhirResource.name[this.fhirResource.name.length - 1].given[1])) {
            this.personObj.middleName = this.fhirResource.name[this.fhirResource.name.length - 1].given[1];
        }
    }

    getId() {
        this.personObj.fhirId = this.fhirResource.id
    }

    setIdentifierJSON(element) {
        let jsonObj = {}
        if (!checkEmptyData(element.code)) {
            jsonObj = {
                type: {
                    "coding": [{
                        system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                        code: element.code
                    }]
                },
                system: element.identifierType,
                value: element.identifierNumber,

            }
        }
        else {
            jsonObj = { value: element.identifierNumber, system: element.identifierType }
        }
        return jsonObj;
    }

    setIdentifier() {
        if (!checkEmptyData(this.personObj.identifier) && this.personObj.identifier.length > 0) {
            this.personObj.identifier.forEach(element => {
                let jsonObj = this.setIdentifierJSON(element);
                this.fhirResource.identifier.push(jsonObj)
            });
        }
    }

    patchIdentifier(fetchedData) {
        let isEmpty = checkEmptyData(fetchedData.identifier);
        if (this.personObj.identifier && this.personObj.identifier.length > 0) {
            this.personObj.identifier.forEach(element => {
                let index = !isEmpty ? fetchedData.identifier.findIndex(idCard => idCard.system == element.identifierType) : 0;
                let path = isEmpty ? "/identifier" : "/identifier/" + index;
                index = index > -1 ? index : 0;
                let jsonObj = this.setIdentifierJSON(element);
                this.fhirResource.push(
                    { "op": element.operation, "path": path, "value": isEmpty ? [jsonObj] : jsonObj });
            })
        }

    }

    getIdentifier() {
        if (this.fhirResource.identifier && this.fhirResource.identifier.length > 0) {
            this.personObj.identifier = [];
            this.fhirResource.identifier.forEach(element => {
                this.personObj.identifier.push({
                    identifierType: element.system,
                    identifierNumber: element.value,
                    code: element.type ? element.type.coding[0].code : null
                })
                this.personObj.id = element.type && element.type.coding[0].code == "MR" ? element.value : this.personObj.id;
            });

        }
    }

    setGender() {
        if (!checkEmptyData(this.personObj.gender)) {
            this.fhirResource.gender = this.personObj.gender
        }
    }

    patchGender() {
        if (!checkEmptyData(this.personObj.gender))
            this.fhirResource.push({ "op": this.personObj.gender.operation, "path": "/gender", "value": this.personObj.gender.value })
    }

    getGender() {
        if (!checkEmptyData(this.fhirResource.gender)) {
            this.personObj.gender = this.fhirResource.gender
        }
    }

    setActive() {
        if (!checkEmptyData(this.personObj.active)) {
            this.fhirResource.active = this.personObj.active
        }
    }

    patchActive() {
        if (!checkEmptyData(this.personObj.active))
            this.fhirResource.push({ "op": this.personObj.active.operation, "path": "/active", "value": this.personObj.active.value })
    }

    getActive() {
        if (!checkEmptyData(this.fhirResource.active)) {
            this.personObj.active = this.fhirResource.active
        }
    }

    setBirthDate() {
        if (!checkEmptyData(this.personObj.birthDate)) {
            this.fhirResource.birthDate = this.personObj.birthDate
        }
    }

    patchBirthDate() {
        if (!checkEmptyData(this.personObj.birthDate))
            this.fhirResource.push({ "op": this.personObj.birthDate.operation, "path": "/birthDate", "value": this.personObj.birthDate.value })
    }

    getBirthDate() {
        if (!checkEmptyData(this.fhirResource.birthDate)) {
            this.personObj.birthDate = this.fhirResource.birthDate
        }
    }

    setEmailAddress() {
        if (!checkEmptyData(this.personObj.email)) {
            this.fhirResource.telecom.push({
                system: "email",
                value: this.personObj.email
            });
        }
    }

    patchEmailAddress(fetchedData) {
        if (!checkEmptyData(this.personObj.email)) {
            let index = fetchedData.telecom ? fetchedData.telecom.findIndex(ele => ele.system == "email") : 0;
            index = index == -1 ? 0 : index;
            let path = !fetchedData.telecom ? "/telecom" : "/telecom/" + index;
            let jsonData = { system: "email", "value": this.personObj.email.value }
            this.fhirResource.push({ "op": this.personObj.email.operation, "path": path, "value": fetchedData.telecom ? jsonData : [jsonData] })
        }
    }

    getEmailAddress() {
        if (!checkEmptyData(this.fhirResource.telecom)) {
            let index = this.fhirResource.telecom.findIndex(e => e.system == "email")
            if (index > -1) {
                this.personObj.email = this.fhirResource.telecom[index].value
            }
        }

    }


    setPhone() {
        if (!checkEmptyData(this.personObj.mobileNumber)) {
            this.fhirResource.telecom.push({
                system: "phone",
                value: this.personObj.mobileNumber,
                rank: 1
            });
        }
    }

    patchPhone(fetchedData) {
        if (!checkEmptyData(this.personObj.mobileNumber)) {
            let index = fetchedData.telecom ? fetchedData.telecom.findIndex(ele => ele.system == "phone") : 0
            index = index == -1 ? 0 : index;
            let path = !fetchedData.telecom ? "/telecom" : "/telecom/" + index;
            let jsonData = { system: "phone", value: this.personObj.mobileNumber.value }
            this.fhirResource.push({ "op": this.personObj.mobileNumber.operation, "path": path, "value": fetchedData.telecom ? jsonData : [jsonData] })
        }
    }

    getPhone() {
        if (this.fhirResource.telecom) {
            let index = this.fhirResource.telecom.findIndex(e => e.system == "phone");
            if (index > -1) {
                this.personObj.mobileNumber = this.fhirResource.telecom[index].value
            }
        }
    }

    setAddress(type) {
        let addressType = type == "home" ? "permanentAddress" : "tempAddress";
        if (this.personObj[addressType] && Object.keys(this.personObj[addressType]).length > 0) {
            let line = [this.personObj[addressType].addressLine1];
            if (!checkEmptyData(this.personObj[addressType].addressLine2)) {
                line.push(this.personObj[addressType].addressLine2)
            }
            this.fhirResource.address.push({
                use: type,
                line: line,
                city: this.personObj[addressType].city,
                district: this.personObj[addressType].district,
                state: this.personObj[addressType].state,
                postalCode: this.personObj[addressType].postalCode,
                country: this.personObj[addressType].country
            })
        }
    }

    patchAddress(type, fetchedResourceData) {
        let addressType = type == "home" ? "permanentAddress" : "tempAddress";
        let isAddressEmpty = checkEmptyData(fetchedResourceData.address);
        let index = 0;
        let path = "/address";
        if (!isAddressEmpty) {
            index = fetchedResourceData.address ? fetchedResourceData.address.findIndex(ele => ele.use == type) : 0;
            index = index == -1 ? 0 : index;
            path = "/address/" + index;
        }
        if (Object.keys(this.personObj[addressType].value).length > 0) {
            let line = [this.personObj[addressType].value.addressLine1];
            if (!checkEmptyData(this.personObj[addressType].value.addressLine2)) {
                line.push(this.personObj[addressType].value.addressLine2)
            }
            let jsonData = {
                use: type,
                line: line,
                city: this.personObj[addressType].value.city,
                district: this.personObj[addressType].value.district,
                state: this.personObj[addressType].value.state,
                postalCode: this.personObj[addressType].value.postalCode,
                country: this.personObj[addressType].value.country
            };

            this.fhirResource.push({
                "op": this.personObj[addressType].operation, "path": path, "value": isAddressEmpty ? [jsonData] : jsonData

            })
        }
    }


    getAddress() {
        if (this.fhirResource.address && this.fhirResource.address.length > 0) {
            let length = this.fhirResource.address.length;
            for (let i = 0; i < length; i++) {
                let addressType = i == 0 ? "permanentAddress" : "tempAddress";
                this.personObj[addressType] = {
                    addressLine1: this.fhirResource.address[i].line[0],
                    city: this.fhirResource.address[i].city,
                    district: this.fhirResource.address[i].district,
                    state: this.fhirResource.address[i].state,
                    postalCode: this.fhirResource.address[i].postalCode,
                    country: this.fhirResource.address[i].country
                }
                if (this.fhirResource.address[i].line[1]) {
                    this.personObj[addressType].addressLine2 = this.fhirResource.address[i].line[1];
                }

            }
        }
    }

    setLink(patientId) {
        this.fhirResource.link.push({
            "target": { "reference": "urn:uuid:" + patientId },
            "assurance": "level3"
        })
    }

    patchLink(index) {
        if (this.personObj.operation == "remove")
            this.fhirResource.push({ "op": this.personObj.operation, "path": "/link/" + index });
        else if (this.personObj.operation == "add")
            this.fhirResource.push({
                "op": this.personObj.operation, "path": "/link/1", value: this.personObj.value
            });
    }

    getFHIRResource() {
        return this.fhirResource;
    }

    getPersonResource() {
        return this.personObj;
    }

    getJsonToFhirTranslator() {
        this.setBasicStructure()
        this.setIdAsIdentifier();
        this.setFirstName();
        this.setMiddleName();
        this.setLastName();
        this.setIdentifier();
        this.setActive();
        this.setGender();
        this.setBirthDate();
        this.setPhone();
        this.setEmailAddress();
        this.setAddress("home");
        this.setAddress("temp");

    }

    getFHIRToUserInput() {
        this.getId();
        this.getFirstName();
        this.getMiddleName();
        this.getLastName();
        this.getIdentifier();
        this.getActive();
        this.getGender();
        this.getBirthDate();
        this.getPhone();
        this.getEmailAddress();
        this.getAddress();
    }

    patchUserInputToFHIR(fetchedResourceData) {
        this.patchFirstName(fetchedResourceData);
        this.patchMiddleName(fetchedResourceData);
        this.patchLastName(fetchedResourceData);
        this.patchIdentifier(fetchedResourceData);
        this.patchActive();
        this.patchGender();
        this.patchBirthDate();
        this.patchPhone(fetchedResourceData);
        this.patchEmailAddress(fetchedResourceData);
        if (this.personObj["permanentAddress"] !== undefined)
            this.patchAddress("home", fetchedResourceData);
        if (this.personObj["tempAddress"] !== undefined)
            this.patchAddress("temp", fetchedResourceData);

    }
}


module.exports = Person;
