let { checkEmptyData } = require("./CheckEmpty");

class Person {
    person_obj;
    fhir_resource;
    constructor(person_obj, fhir_resource) {
        this.person_obj = person_obj;
        this.fhir_resource = fhir_resource;
    }


    setFirstName() {

        this.fhir_resource.name = [];
        let firstName = this.person_obj.firstName;
        if (!checkEmptyData(firstName)) {
            let length = this.fhir_resource.name.length
            this.fhir_resource.name[length] = {};
            this.fhir_resource.name[length].given = [];
            this.fhir_resource.name[length].given.push(firstName);
        }

    }

    patchFirstName(fetchedData) {
        let isEmpty = checkEmptyData(fetchedData.name);
        if (!checkEmptyData(this.person_obj.firstName) && !isEmpty) {
            this.fhir_resource.push({ "op": this.person_obj.firstName.operation, "path": "/name/0/given/0", "value": this.person_obj.firstName.value });
        }
    }

    getFirstName() {
        if (this.fhir_resource.name && !checkEmptyData(this.fhir_resource.name[this.fhir_resource.name.length - 1].given[0])) {
            this.person_obj.firstName = this.fhir_resource.name[this.fhir_resource.name.length - 1].given[0]
        }
    }

    setLastName() {
        let lastName = this.person_obj.lastName;
        if (!checkEmptyData(lastName)) {
            let length = this.fhir_resource.name.length > 0 ? this.fhir_resource.name.length - 1 : 0;
            this.fhir_resource.name[length].family = lastName;
        }

    }

    patchLastName(fetchedData) {
        let isEmpty = checkEmptyData(fetchedData.name);
        if (!checkEmptyData(this.person_obj.lastName) && !isEmpty)
            this.fhir_resource.push({ "op": this.person_obj.lastName.operation, "path": "/name/0/family", "value": this.person_obj.lastName.value })
    }

    getLastName() {
        if (this.fhir_resource.name && !checkEmptyData(this.fhir_resource.name[this.fhir_resource.name.length - 1].family)) {
            this.person_obj.lastName = this.fhir_resource.name[this.fhir_resource.name.length - 1].family
        }
    }

    setMiddleName(fetchedData) {
        let middleName = this.person_obj.middleName;
        if (!checkEmptyData(middleName)) {
            let length = this.fhir_resource.name.length;
            this.fhir_resource.name[length - 1].given.push(middleName);
        }

    }

    patchMiddleName(fetchedData) {
        let isEmpty = checkEmptyData(fetchedData.name);
        if (!checkEmptyData(this.person_obj.middleName) && !isEmpty)
            this.fhir_resource.push({ "op": this.person_obj.middleName.operation, "path": "/name/0/given/1", "value": this.person_obj.middleName.value })
    }


    getMiddleName() {
        if (this.fhir_resource.name && !checkEmptyData(this.fhir_resource.name[this.fhir_resource.name.length - 1].given[1])) {
            this.person_obj.middleName = this.fhir_resource.name[this.fhir_resource.name.length - 1].given[1];
        }
    }

    getId() {
        this.person_obj.fhirId = this.fhir_resource.id
    }
    setIdentifierJSON(element) {
        let jsonObj = {}
        if (element.code && element.code !== null && element.code !== "") {
            jsonObj = {
                type: {
                    "coding": [{
                        system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                        code: element.code
                    }
                    ]
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
        this.fhir_resource.identifier = [];
        if (this.person_obj.identifier && this.person_obj.identifier.length > 0) {
            this.person_obj.identifier.forEach(element => {
                let jsonObj = this.setIdentifierJSON(element);
                this.fhir_resource.identifier.push(jsonObj)
            });
        }
    }

    patchIdentifier(fetchedData) {
        let isEmpty = checkEmptyData(fetchedData.identifier);
        if (this.person_obj.identifier && this.person_obj.identifier.length > 0) {
            this.person_obj.identifier.forEach(element => {
                let index = !isEmpty ? fetchedData.identifier.findIndex(idCard => idCard.system == element.identifierType) : 0;
                let path = isEmpty ? "/identifier" : "/identifier/" + index;
                index = index > -1 ? index : 0;
                let jsonObj = this.setIdentifierJSON(element);
                this.fhir_resource.push(
                    { "op": element.operation, "path": path, "value": isEmpty ? [jsonObj] : jsonObj});
            })
        }

    }

    getIdentifier() {
        if (this.fhir_resource.identifier && this.fhir_resource.identifier.length > 0) {
            this.person_obj.identifier = [];
            this.fhir_resource.identifier.forEach(element => {
                this.person_obj.identifier.push({
                    identifierType: element.system,
                    identifierNumber: element.value,
                    code: element.type ? element.type.coding[0].code : null
                })
            });
        }
    }

    setGender() {
        if (!checkEmptyData(this.person_obj.gender)) {
            this.fhir_resource.gender = this.person_obj.gender
        }
    }

    patchGender() {
        if (!checkEmptyData(this.person_obj.gender))
            this.fhir_resource.push({ "op": this.person_obj.gender.operation, "path": "/gender", "value": this.person_obj.gender.value })
    }

    getGender() {
        if (!checkEmptyData(this.fhir_resource.gender)) {
            this.person_obj.gender = this.fhir_resource.gender
        }
    }

    setActive() {
        if (!checkEmptyData(this.person_obj.active)) {
            this.fhir_resource.active = this.person_obj.active
        }
    }

    patchActive() {
        if (!checkEmptyData(this.person_obj.active))
            this.fhir_resource.push({ "op": this.person_obj.active.operation, "path": "/active", "value": this.person_obj.active.value })
    }

    getActive() {
        if (!checkEmptyData(this.fhir_resource.active)) {
            this.person_obj.active = this.fhir_resource.active
        }
    }

    setBirthDate() {
        if (!checkEmptyData(this.person_obj.birthDate)) {
            this.fhir_resource.birthDate = this.person_obj.birthDate
        }
    }

    patchBirthDate() {
        if (!checkEmptyData(this.person_obj.birthDate))
            this.fhir_resource.push({ "op": this.person_obj.birthDate.operation, "path": "/birthDate", "value": this.person_obj.birthDate.value })
    }

    getBirthDate() {
        if (!checkEmptyData(this.fhir_resource.birthDate)) {
            this.person_obj.birthDate = this.fhir_resource.birthDate
        }
    }

    setEmailAddress() {
        if (!checkEmptyData(this.person_obj.email)) {
            this.fhir_resource.telecom.push({
                system: "email",
                value: this.person_obj.email
            });
        }
    }

    patchEmailAddress(fetchedData) {
        if (!checkEmptyData(this.person_obj.email)) {
            let index = fetchedData.telecom ? fetchedData.telecom.findIndex(ele => ele.system == "email") : 0;
            index = index == -1 ? 0 : index;
            let path = !fetchedData.telecom ? "/telecom" : "/telecom/" + index;
            let jsonData =  { system: "email", "value": this.person_obj.email.value }
            this.fhir_resource.push({ "op": this.person_obj.email.operation, "path": path, "value":  fetchedData.telecom ? jsonData : [jsonData]})
        }
    }

    getEmailAddress() {
        if (this.fhir_resource.telecom) {
            let index = this.fhir_resource.telecom.findIndex(e => e.system == "email")
            if (index > -1) {
                this.person_obj.email = this.fhir_resource.telecom[index].value
            }
        }

    }


    setPhone() {
        this.fhir_resource.telecom = [];
        if (!checkEmptyData(this.person_obj.mobileNumber)) {
            this.fhir_resource.telecom.push({
                system: "phone",
                value: this.person_obj.mobileNumber,
                rank: 1
            });
        }
    }

    patchPhone(fetchedData) {
        if (!checkEmptyData(this.person_obj.mobileNumber)) {
            let index = fetchedData.telecom ? fetchedData.telecom.findIndex(ele => ele.system == "phone") : 0
            index = index == -1 ? 0 : index;
            let path = !fetchedData.telecom ? "/telecom" : "/telecom/" + index;
            let jsonData = { system: "phone", value: this.person_obj.mobileNumber.value }
            this.fhir_resource.push({ "op": this.person_obj.mobileNumber.operation, "path": path, "value":  fetchedData.telecom ? jsonData : [jsonData]})
        }
    }

    getPhone() {
        if (this.fhir_resource.telecom) {
            let index = this.fhir_resource.telecom.findIndex(e => e.system == "phone");
            // console.log("index of mobile number", index, this.fhir_resource.telecom)
            if (index > -1) {
                this.person_obj.mobileNumber = this.fhir_resource.telecom[index].value
            }
        }
    }

    setAddress(type) {
        let address_type = type == "home" ? "permanentAddress" : "tempAddress"
        if (type == "home")
            this.fhir_resource.address = [];
        // console.log(address_type)
        if (this.person_obj[address_type] && Object.keys(this.person_obj[address_type]).length > 0) {
            let line = [this.person_obj[address_type].addressLine1];
            if (!checkEmptyData(this.person_obj[address_type].addressLine2)) {
                line.push(this.person_obj[address_type].addressLine2)
            }
            this.fhir_resource.address.push({
                use: type,
                line: line,
                city: this.person_obj[address_type].city,
                district: this.person_obj[address_type].district,
                state: this.person_obj[address_type].state,
                postalCode: this.person_obj[address_type].postalCode,
                country: this.person_obj[address_type].country
            })
        }
    }

    patchAddress(type, fetchedResourceData) {
        let address_type = type == "home" ? "permanentAddress" : "tempAddress";
        let isAddressEmpty = checkEmptyData(fetchedResourceData.address);
        let index = 0;
        let path = "/address";
        if (!isAddressEmpty) {
            index = fetchedResourceData.address ? fetchedResourceData.address.findIndex(ele => ele.use == type) : 0;
            index = index == -1 ? 0 : index;
            path = "/address/" + index
        }     


        if (Object.keys(this.person_obj[address_type].value).length > 0) {
            let line = [this.person_obj[address_type].value.addressLine1];
            if (!checkEmptyData(this.person_obj[address_type].value.addressLine2)) {
                line.push(this.person_obj[address_type].value.addressLine2)
            }
            let jsonData = {
                use: type,
                line: line,
                city: this.person_obj[address_type].value.city,
                district: this.person_obj[address_type].value.district,
                state: this.person_obj[address_type].value.state,
                postalCode: this.person_obj[address_type].value.postalCode,
                country: this.person_obj[address_type].value.country
            };
            
            this.fhir_resource.push({
                "op": this.person_obj[address_type].operation, "path": path, "value": isAddressEmpty ? [jsonData] : jsonData
                
            })
        }
    }


    getAddress() {
        if (this.fhir_resource.address && this.fhir_resource.address.length > 0) {
            let length = this.fhir_resource.address.length;
            for (let i = 0; i < length; i++) {
                let address_type = i == 0 ? "permanentAddress" : "tempAddress";
                this.person_obj[address_type] = {
                    addressLine1: this.fhir_resource.address[i].line[0],
                    city: this.fhir_resource.address[i].city,
                    district: this.fhir_resource.address[i].district,
                    state: this.fhir_resource.address[i].state,
                    postalCode: this.fhir_resource.address[i].postalCode,
                    country: this.fhir_resource.address[i].country
                }
                if (this.fhir_resource.address[i].line[1]) {
                    this.person_obj[address_type].addressLine2 = this.fhir_resource.address[i].line[1];
                }

            }
        }
    }

    setLink(patientId) {
        this.fhir_resource.link = [];
        this.fhir_resource.link.push({
            "target": {"reference": "urn:uuid:" +patientId},
            "assurance": "level3"
        })
    }

    patchLink(fetchedResourceData) {
        let index = 0;
        if(fetchedResourceData.link)
            index = fetchedResourceData.link.length
        this.fhir_resource.push(
        {"op": this.person_obj.relation.operation, "path": "/link/" + index, value: {"target": {"reference:": this.person_obj.relation.value}, assurance: "level3"}})
    }

    getFHIRResource() {
        return this.fhir_resource;
    }

    getPersonResource() {
        return this.person_obj;
    }

    getJsonToFhirTranslator() {
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
        if (this.person_obj["permanentAddress"] !== undefined)
            this.patchAddress("home", fetchedResourceData);
        if (this.person_obj["tempAddress"] !== undefined)
            this.patchAddress("temp", fetchedResourceData);

    }
}


module.exports = Person;
