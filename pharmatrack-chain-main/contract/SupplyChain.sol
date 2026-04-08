// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SupplyChain {
    // ********** Owner **********
    address public owner;
    bool private paused;

    // ********** Events **********
    event MedicineAdded(uint256 indexed id, string name, uint256 quantity);
    event StageChanged(uint256 indexed medicineId, STAGE stage, uint256 timestamp);
    event RMSAdded(uint256 indexed id, address indexed addr, string name);
    event ManufacturerAdded(uint256 indexed id, address indexed addr, string name);
    event DistributorAdded(uint256 indexed id, address indexed addr, string name);
    event RetailerAdded(uint256 indexed id, address indexed addr, string name);
    event RMSDeactivated(uint256 id);
    event RMSActivated(uint256 id);
    event ManufacturerDeactivated(uint256 id);
    event ManufacturerActivated(uint256 id);
    event DistributorDeactivated(uint256 id);
    event DistributorActivated(uint256 id);
    event RetailerDeactivated(uint256 id);
    event RetailerActivated(uint256 id);
    event MedicineAssignedRMS(uint256 medicineId, uint256 rmsId);
    event MedicineAssignedManufacturer(uint256 medicineId, uint256 manId);
    event MedicineAssignedDistributor(uint256 medicineId, uint256 disId);
    event MedicineAssignedRetailer(uint256 medicineId, uint256 retId);
    event MedicineRecalled(uint256 medicineId);
    event MedicineSold(uint256 medicineId, address consumer, uint8 rating);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event BatchRecalled(string batchNumber, uint256 timestamp);
    event Paused(address account);
    event Unpaused(address account);

    // ********** Modifiers **********
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier onlyActiveRMS() {
        uint256 id = rmsAddressToId[msg.sender];
        require(id != 0 && rms[id].active, "Not an active RMS");
        _;
    }

    modifier onlyActiveManufacturer() {
        uint256 id = manAddressToId[msg.sender];
        require(id != 0 && man[id].active, "Not an active Manufacturer");
        _;
    }

    modifier onlyActiveDistributor() {
        uint256 id = disAddressToId[msg.sender];
        require(id != 0 && dis[id].active, "Not an active Distributor");
        _;
    }

    modifier onlyActiveRetailer() {
        uint256 id = retAddressToId[msg.sender];
        require(id != 0 && ret[id].active, "Not an active Retailer");
        _;
    }

    // ********** Stages **********
    enum STAGE {
        Init,
        RawMaterialSupply,
        Manufacture,
        Distribution,
        Retail,
        Sold,
        Recalled
    }

    // ********** Counters **********
    uint256 public medicineCtr = 0;
    uint256 public rmsCtr = 0;
    uint256 public manCtr = 0;
    uint256 public disCtr = 0;
    uint256 public retCtr = 0;

    // ********** Address to ID mappings (for O(1) lookup) **********
    mapping(address => uint256) public rmsAddressToId;
    mapping(address => uint256) public manAddressToId;
    mapping(address => uint256) public disAddressToId;
    mapping(address => uint256) public retAddressToId;

    // ********** Role structs **********
    struct RawMaterialSupplier {
        address addr;
        uint256 id;
        string name;
        string place;
        bool active;
    }

    struct Manufacturer {
        address addr;
        uint256 id;
        string name;
        string place;
        bool active;
    }

    struct Distributor {
        address addr;
        uint256 id;
        string name;
        string place;
        bool active;
    }

    struct Retailer {
        address addr;
        uint256 id;
        string name;
        string place;
        bool active;
    }

    // ********** Medicine struct **********
    struct Medicine {
        uint256 id;
        string name;
        string description;
        string batchNumber;
        uint256 manufacturingDate;
        uint256 expiryDate;
        uint256 quantity;
        uint256 price;
        // Assigned participants (who should perform the next stage)
        uint256 assignedRMSid;
        uint256 assignedMANid;
        uint256 assignedDISid;
        uint256 assignedRETid;
        // Actual participants who performed the stage
        uint256 RMSid;
        uint256 MANid;
        uint256 DISid;
        uint256 RETid;
        // Timestamps of stage completions
        uint256 rmsSupplyTime;
        uint256 manufactureTime;
        uint256 distributionTime;
        uint256 retailTime;
        uint256 soldTime;
        // Consumer info
        address consumer;
        uint8 rating; // 1-5
        STAGE stage;
    }

    // ********** Storage **********
    mapping(uint256 => RawMaterialSupplier) public rms;
    mapping(uint256 => Manufacturer) public man;
    mapping(uint256 => Distributor) public dis;
    mapping(uint256 => Retailer) public ret;
    mapping(uint256 => Medicine) public medicines;
    mapping(string => bool) public batchRecalled;

    // ********** Constructor **********
    constructor() {
        owner = msg.sender;
        paused = false;
    }

    // ********** Pause / Unpause **********
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ********** Ownership Transfer **********
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ********** Role Management (onlyOwner) **********
    function addRMS(address _address, string memory _name, string memory _place) external onlyOwner {
        require(_address != address(0), "Invalid address");
        require(!isAddressRegistered(_address), "Address already registered in another role");
        rmsCtr++;
        rms[rmsCtr] = RawMaterialSupplier(_address, rmsCtr, _name, _place, true);
        rmsAddressToId[_address] = rmsCtr;
        emit RMSAdded(rmsCtr, _address, _name);
    }

    function deactivateRMS(uint256 id) external onlyOwner {
        require(rms[id].addr != address(0), "RMS does not exist");
        require(rms[id].active, "Already inactive");
        rms[id].active = false;
        emit RMSDeactivated(id);
    }

    function activateRMS(uint256 id) external onlyOwner {
        require(rms[id].addr != address(0), "RMS does not exist");
        require(!rms[id].active, "Already active");
        rms[id].active = true;
        emit RMSActivated(id);
    }

    function addManufacturer(address _address, string memory _name, string memory _place) external onlyOwner {
        require(_address != address(0), "Invalid address");
        require(!isAddressRegistered(_address), "Address already registered in another role");
        manCtr++;
        man[manCtr] = Manufacturer(_address, manCtr, _name, _place, true);
        manAddressToId[_address] = manCtr;
        emit ManufacturerAdded(manCtr, _address, _name);
    }

    function deactivateManufacturer(uint256 id) external onlyOwner {
        require(man[id].addr != address(0), "Manufacturer does not exist");
        require(man[id].active, "Already inactive");
        man[id].active = false;
        emit ManufacturerDeactivated(id);
    }

    function activateManufacturer(uint256 id) external onlyOwner {
        require(man[id].addr != address(0), "Manufacturer does not exist");
        require(!man[id].active, "Already active");
        man[id].active = true;
        emit ManufacturerActivated(id);
    }

    function addDistributor(address _address, string memory _name, string memory _place) external onlyOwner {
        require(_address != address(0), "Invalid address");
        require(!isAddressRegistered(_address), "Address already registered in another role");
        disCtr++;
        dis[disCtr] = Distributor(_address, disCtr, _name, _place, true);
        disAddressToId[_address] = disCtr;
        emit DistributorAdded(disCtr, _address, _name);
    }

    function deactivateDistributor(uint256 id) external onlyOwner {
        require(dis[id].addr != address(0), "Distributor does not exist");
        require(dis[id].active, "Already inactive");
        dis[id].active = false;
        emit DistributorDeactivated(id);
    }

    function activateDistributor(uint256 id) external onlyOwner {
        require(dis[id].addr != address(0), "Distributor does not exist");
        require(!dis[id].active, "Already active");
        dis[id].active = true;
        emit DistributorActivated(id);
    }

    function addRetailer(address _address, string memory _name, string memory _place) external onlyOwner {
        require(_address != address(0), "Invalid address");
        require(!isAddressRegistered(_address), "Address already registered in another role");
        retCtr++;
        ret[retCtr] = Retailer(_address, retCtr, _name, _place, true);
        retAddressToId[_address] = retCtr;
        emit RetailerAdded(retCtr, _address, _name);
    }

    function deactivateRetailer(uint256 id) external onlyOwner {
        require(ret[id].addr != address(0), "Retailer does not exist");
        require(ret[id].active, "Already inactive");
        ret[id].active = false;
        emit RetailerDeactivated(id);
    }

    function activateRetailer(uint256 id) external onlyOwner {
        require(ret[id].addr != address(0), "Retailer does not exist");
        require(!ret[id].active, "Already active");
        ret[id].active = true;
        emit RetailerActivated(id);
    }

    // Internal helper to check if an address is already registered in any role
    function isAddressRegistered(address _addr) internal view returns (bool) {
        return (rmsAddressToId[_addr] != 0 ||
                manAddressToId[_addr] != 0 ||
                disAddressToId[_addr] != 0 ||
                retAddressToId[_addr] != 0);
    }

    // ********** Medicine Management (onlyOwner) **********
    function addMedicine(
        string memory _name,
        string memory _description,
        string memory _batchNumber,
        uint256 _manufacturingDate,
        uint256 _expiryDate,
        uint256 _quantity,
        uint256 _price
    ) external onlyOwner whenNotPaused {
        require(_manufacturingDate <= _expiryDate, "Manufacturing date must be <= expiry date");
        require(_quantity > 0, "Quantity must be positive");
        medicineCtr++;

        // Assign fields directly to storage to avoid a large memory struct
        Medicine storage med = medicines[medicineCtr];
        med.id = medicineCtr;
        med.name = _name;
        med.description = _description;
        med.batchNumber = _batchNumber;
        med.manufacturingDate = _manufacturingDate;
        med.expiryDate = _expiryDate;
        med.quantity = _quantity;
        med.price = _price;
        med.assignedRMSid = 0;
        med.assignedMANid = 0;
        med.assignedDISid = 0;
        med.assignedRETid = 0;
        med.RMSid = 0;
        med.MANid = 0;
        med.DISid = 0;
        med.RETid = 0;
        med.rmsSupplyTime = 0;
        med.manufactureTime = 0;
        med.distributionTime = 0;
        med.retailTime = 0;
        med.soldTime = 0;
        med.consumer = address(0);
        med.rating = 0;
        med.stage = STAGE.Init;

        emit MedicineAdded(medicineCtr, _name, _quantity);
    }

    // ********** Assignment Functions (onlyOwner) **********
    function assignRMS(uint256 _medicineId, uint256 _rmsId) external onlyOwner whenNotPaused {
        require(_medicineId > 0 && _medicineId <= medicineCtr, "Invalid medicine ID");
        require(_rmsId > 0 && _rmsId <= rmsCtr && rms[_rmsId].active, "Invalid or inactive RMS");
        Medicine storage med = medicines[_medicineId];
        require(med.stage == STAGE.Init, "Medicine not in Init stage");
        med.assignedRMSid = _rmsId;
        emit MedicineAssignedRMS(_medicineId, _rmsId);
    }

    function assignManufacturer(uint256 _medicineId, uint256 _manId) external onlyOwner whenNotPaused {
        require(_medicineId > 0 && _medicineId <= medicineCtr, "Invalid medicine ID");
        require(_manId > 0 && _manId <= manCtr && man[_manId].active, "Invalid or inactive Manufacturer");
        Medicine storage med = medicines[_medicineId];
        require(med.stage == STAGE.RawMaterialSupply, "Medicine not in RawMaterialSupply stage");
        med.assignedMANid = _manId;
        emit MedicineAssignedManufacturer(_medicineId, _manId);
    }

    function assignDistributor(uint256 _medicineId, uint256 _disId) external onlyOwner whenNotPaused {
        require(_medicineId > 0 && _medicineId <= medicineCtr, "Invalid medicine ID");
        require(_disId > 0 && _disId <= disCtr && dis[_disId].active, "Invalid or inactive Distributor");
        Medicine storage med = medicines[_medicineId];
        require(med.stage == STAGE.Manufacture, "Medicine not in Manufacture stage");
        med.assignedDISid = _disId;
        emit MedicineAssignedDistributor(_medicineId, _disId);
    }

    function assignRetailer(uint256 _medicineId, uint256 _retId) external onlyOwner whenNotPaused {
        require(_medicineId > 0 && _medicineId <= medicineCtr, "Invalid medicine ID");
        require(_retId > 0 && _retId <= retCtr && ret[_retId].active, "Invalid or inactive Retailer");
        Medicine storage med = medicines[_medicineId];
        require(med.stage == STAGE.Distribution, "Medicine not in Distribution stage");
        med.assignedRETid = _retId;
        emit MedicineAssignedRetailer(_medicineId, _retId);
    }

    // ********** Stage Transition Functions **********
    function rmsSupply(uint256 _medicineId) external onlyActiveRMS whenNotPaused {
        require(_medicineId > 0 && _medicineId <= medicineCtr, "Invalid medicine ID");
        Medicine storage med = medicines[_medicineId];
        require(med.stage == STAGE.Init, "Medicine not in Init stage");
        require(!batchRecalled[med.batchNumber], "Batch has been recalled");
        uint256 rmsId = rmsAddressToId[msg.sender];
        require(med.assignedRMSid == rmsId, "You are not the assigned RMS for this medicine");
        med.RMSid = rmsId;
        med.rmsSupplyTime = block.timestamp;
        med.stage = STAGE.RawMaterialSupply;
        emit StageChanged(_medicineId, STAGE.RawMaterialSupply, block.timestamp);
    }

    function manufacture(uint256 _medicineId) external onlyActiveManufacturer whenNotPaused {
        require(_medicineId > 0 && _medicineId <= medicineCtr, "Invalid medicine ID");
        Medicine storage med = medicines[_medicineId];
        require(med.stage == STAGE.RawMaterialSupply, "Medicine not in RawMaterialSupply stage");
        require(!batchRecalled[med.batchNumber], "Batch has been recalled");
        uint256 manId = manAddressToId[msg.sender];
        require(med.assignedMANid == manId, "You are not the assigned Manufacturer for this medicine");
        med.MANid = manId;
        med.manufactureTime = block.timestamp;
        med.stage = STAGE.Manufacture;
        emit StageChanged(_medicineId, STAGE.Manufacture, block.timestamp);
    }

    function distribute(uint256 _medicineId) external onlyActiveDistributor whenNotPaused {
        require(_medicineId > 0 && _medicineId <= medicineCtr, "Invalid medicine ID");
        Medicine storage med = medicines[_medicineId];
        require(med.stage == STAGE.Manufacture, "Medicine not in Manufacture stage");
        require(!batchRecalled[med.batchNumber], "Batch has been recalled");
        uint256 disId = disAddressToId[msg.sender];
        require(med.assignedDISid == disId, "You are not the assigned Distributor for this medicine");
        med.DISid = disId;
        med.distributionTime = block.timestamp;
        med.stage = STAGE.Distribution;
        emit StageChanged(_medicineId, STAGE.Distribution, block.timestamp);
    }

    function retail(uint256 _medicineId) external onlyActiveRetailer whenNotPaused {
        require(_medicineId > 0 && _medicineId <= medicineCtr, "Invalid medicine ID");
        Medicine storage med = medicines[_medicineId];
        require(med.stage == STAGE.Distribution, "Medicine not in Distribution stage");
        require(!batchRecalled[med.batchNumber], "Batch has been recalled");
        uint256 retId = retAddressToId[msg.sender];
        require(med.assignedRETid == retId, "You are not the assigned Retailer for this medicine");
        med.RETid = retId;
        med.retailTime = block.timestamp;
        med.stage = STAGE.Retail;
        emit StageChanged(_medicineId, STAGE.Retail, block.timestamp);
    }

    function sold(uint256 _medicineId, address _consumer, uint8 _rating) external onlyActiveRetailer whenNotPaused {
        require(_medicineId > 0 && _medicineId <= medicineCtr, "Invalid medicine ID");
        require(_consumer != address(0), "Invalid consumer address");
        require(_rating >= 1 && _rating <= 5, "Rating must be between 1 and 5");
        Medicine storage med = medicines[_medicineId];
        require(med.stage == STAGE.Retail, "Medicine not in Retail stage");
        require(!batchRecalled[med.batchNumber], "Batch has been recalled");
        uint256 retId = retAddressToId[msg.sender];
        require(med.assignedRETid == retId, "You are not the assigned Retailer for this medicine");
        require(med.RETid == retId, "Retailer mismatch");
        med.consumer = _consumer;
        med.rating = _rating;
        med.soldTime = block.timestamp;
        med.stage = STAGE.Sold;
        emit MedicineSold(_medicineId, _consumer, _rating);
        emit StageChanged(_medicineId, STAGE.Sold, block.timestamp);
    }

    // ********** Recall Function **********
    function recallMedicine(uint256 _medicineId) external whenNotPaused {
        require(_medicineId > 0 && _medicineId <= medicineCtr, "Invalid medicine ID");
        Medicine storage med = medicines[_medicineId];
        require(med.stage != STAGE.Sold && med.stage != STAGE.Recalled, "Cannot recall after sold or already recalled");
        if (msg.sender != owner) {
            uint256 manId = manAddressToId[msg.sender];
            require(manId > 0 && man[manId].active, "Only owner or active manufacturer can recall");
            require(med.assignedMANid == manId || med.MANid == manId, "You are not the manufacturer for this medicine");
        }
        med.stage = STAGE.Recalled;
        emit MedicineRecalled(_medicineId);
        emit StageChanged(_medicineId, STAGE.Recalled, block.timestamp);
    }

    function recallBatch(string calldata _batchNumber) external whenNotPaused {
        if (msg.sender != owner) {
            uint256 manId = manAddressToId[msg.sender];
            require(manId > 0 && man[manId].active, "Only owner or active manufacturer can recall a batch");
            // Note: We don't strictly enforce that the manufacturer must have products in the batch here,
            // as it would require iterating over all products. 
            // In a real system, we'd check if the caller is authorized for THIS batch.
        }
        batchRecalled[_batchNumber] = true;
        emit BatchRecalled(_batchNumber, block.timestamp);
    }

    // ********** View Functions **********
    function showStage(uint256 _medicineID) external view returns (string memory) {
        require(_medicineID > 0 && _medicineID <= medicineCtr, "Invalid medicine ID");
        STAGE stage = medicines[_medicineID].stage;
        if (stage == STAGE.Init) return "Medicine Ordered";
        else if (stage == STAGE.RawMaterialSupply) return "Raw Material Supply Stage";
        else if (stage == STAGE.Manufacture) return "Manufacturing Stage";
        else if (stage == STAGE.Distribution) return "Distribution Stage";
        else if (stage == STAGE.Retail) return "Retail Stage";
        else if (stage == STAGE.Sold) return "Medicine Sold";
        else if (stage == STAGE.Recalled) return "Medicine Recalled";
        else return "Unknown Stage";
    }

    // Helper to get medicines by participant
    function getMedicinesByRMS(uint256 _rmsId) external view returns (uint256[] memory) {
        require(_rmsId > 0 && _rmsId <= rmsCtr, "Invalid RMS ID");
        uint256 count = 0;
        for (uint256 i = 1; i <= medicineCtr; i++) {
            if (medicines[i].RMSid == _rmsId || medicines[i].assignedRMSid == _rmsId) {
                count++;
            }
        }
        uint256[] memory ids = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= medicineCtr; i++) {
            if (medicines[i].RMSid == _rmsId || medicines[i].assignedRMSid == _rmsId) {
                ids[index] = i;
                index++;
            }
        }
        return ids;
    }

    function getMedicinesByManufacturer(uint256 _manId) external view returns (uint256[] memory) {
        require(_manId > 0 && _manId <= manCtr, "Invalid Manufacturer ID");
        uint256 count = 0;
        for (uint256 i = 1; i <= medicineCtr; i++) {
            if (medicines[i].MANid == _manId || medicines[i].assignedMANid == _manId) {
                count++;
            }
        }
        uint256[] memory ids = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= medicineCtr; i++) {
            if (medicines[i].MANid == _manId || medicines[i].assignedMANid == _manId) {
                ids[index] = i;
                index++;
            }
        }
        return ids;
    }

    function getMedicinesByDistributor(uint256 _disId) external view returns (uint256[] memory) {
        require(_disId > 0 && _disId <= disCtr, "Invalid Distributor ID");
        uint256 count = 0;
        for (uint256 i = 1; i <= medicineCtr; i++) {
            if (medicines[i].DISid == _disId || medicines[i].assignedDISid == _disId) {
                count++;
            }
        }
        uint256[] memory ids = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= medicineCtr; i++) {
            if (medicines[i].DISid == _disId || medicines[i].assignedDISid == _disId) {
                ids[index] = i;
                index++;
            }
        }
        return ids;
    }

    function getMedicinesByRetailer(uint256 _retId) external view returns (uint256[] memory) {
        require(_retId > 0 && _retId <= retCtr, "Invalid Retailer ID");
        uint256 count = 0;
        for (uint256 i = 1; i <= medicineCtr; i++) {
            if (medicines[i].RETid == _retId || medicines[i].assignedRETid == _retId) {
                count++;
            }
        }
        uint256[] memory ids = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= medicineCtr; i++) {
            if (medicines[i].RETid == _retId || medicines[i].assignedRETid == _retId) {
                ids[index] = i;
                index++;
            }
        }
        return ids;
    }

    function getMedicinesByStage(STAGE _stage) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= medicineCtr; i++) {
            if (medicines[i].stage == _stage) {
                count++;
            }
        }
        uint256[] memory ids = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= medicineCtr; i++) {
            if (medicines[i].stage == _stage) {
                ids[index] = i;
                index++;
            }
        }
        return ids;
    }

    // ********** Fallback **********
    receive() external payable {
        revert("Contract does not accept Ether");
    }

    fallback() external payable {
        revert("Contract does not accept Ether");
    }
}