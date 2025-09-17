// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NeuralGridCore
 * @notice Minimal core marketplace contract for NeuralGrid MVP
 */
contract NeuralGridCore {
    enum JobStatus { PENDING, ACTIVE, COMPLETED, FAILED }

    struct ComputeNode {
        address owner;
        uint256 computePower; // arbitrary units
        uint256 reputation;   // simple score
        uint256 totalEarnings;
        bool isActive;
        uint256 lastHeartbeat;
    }

    struct ComputeJob {
        uint256 jobId;
        address requester;
        string description;
        uint256 reward; // total reward in wei (for demo)
        uint256 requiredNodes;
        uint256 deadline;
        JobStatus status;
        uint256 completedNodes;
    }

    event NodeRegistered(address indexed node, uint256 computePower);
    event JobCreated(uint256 indexed jobId, address indexed requester, uint256 reward);
    event JobCompleted(uint256 indexed jobId, address indexed node, uint256 reward);

    mapping(address => ComputeNode) public nodes;
    mapping(uint256 => ComputeJob) public jobs;
    uint256 public nextJobId;
    uint256 public totalNodes;

    // --- Node Management ---
    function registerNode(uint256 computePower) external {
        ComputeNode storage n = nodes[msg.sender];
        if (n.owner == address(0)) {
            totalNodes += 1;
            n.owner = msg.sender;
            n.reputation = 100;
        }
        n.computePower = computePower;
        n.isActive = true;
        n.lastHeartbeat = block.timestamp;
        emit NodeRegistered(msg.sender, computePower);
    }

    function heartbeat(bool active) external {
        ComputeNode storage n = nodes[msg.sender];
        require(n.owner != address(0), "not registered");
        n.isActive = active;
        n.lastHeartbeat = block.timestamp;
    }

    function getNodeStats(address node) external view returns (
        uint256 computePower,
        uint256 reputation,
        uint256 totalEarnings,
        bool isActive,
        uint256 lastHeartbeat
    ) {
        ComputeNode memory n = nodes[node];
        return (n.computePower, n.reputation, n.totalEarnings, n.isActive, n.lastHeartbeat);
    }

    // --- Job Management ---
    function createJob(string calldata description, uint256 requiredNodes, uint256 deadline) external payable returns (uint256 jobId) {
        require(requiredNodes > 0, "requiredNodes");
        require(deadline > block.timestamp, "deadline");
        require(msg.value > 0, "reward");

        jobId = ++nextJobId;
        jobs[jobId] = ComputeJob({
            jobId: jobId,
            requester: msg.sender,
            description: description,
            reward: msg.value,
            requiredNodes: requiredNodes,
            deadline: deadline,
            status: JobStatus.PENDING,
            completedNodes: 0
        });

        emit JobCreated(jobId, msg.sender, msg.value);
    }

    function completeJob(uint256 jobId) external {
        ComputeJob storage j = jobs[jobId];
        require(j.jobId != 0, "job");
        require(j.status == JobStatus.PENDING || j.status == JobStatus.ACTIVE, "status");
        require(block.timestamp <= j.deadline, "expired");
        // Very naive distribution: equal split to each completion call until requiredNodes reached
        j.completedNodes += 1;
        if (j.completedNodes >= j.requiredNodes) {
            j.status = JobStatus.COMPLETED;
        } else {
            j.status = JobStatus.ACTIVE;
        }
        uint256 share = j.reward / j.requiredNodes;
        nodes[msg.sender].totalEarnings += share;
        (bool ok, ) = payable(msg.sender).call{value: share}("");
        require(ok, "pay");
        emit JobCompleted(jobId, msg.sender, share);
    }

    // --- Views ---
    function getAvailableJobs() external view returns (ComputeJob[] memory list) {
        uint256 count;
        for (uint256 i = 1; i <= nextJobId; i++) {
            ComputeJob storage j = jobs[i];
            if (j.status == JobStatus.PENDING || j.status == JobStatus.ACTIVE) {
                count++;
            }
        }
        list = new ComputeJob[](count);
        uint256 idx;
        for (uint256 i = 1; i <= nextJobId; i++) {
            ComputeJob storage j = jobs[i];
            if (j.status == JobStatus.PENDING || j.status == JobStatus.ACTIVE) {
                list[idx++] = j;
            }
        }
    }

    function getTotalStats() external view returns (uint256 _totalNodes, uint256 totalJobs, uint256 activeJobs) {
        _totalNodes = totalNodes;
        totalJobs = nextJobId;
        for (uint256 i = 1; i <= nextJobId; i++) {
            ComputeJob storage j = jobs[i];
            if (j.status == JobStatus.PENDING || j.status == JobStatus.ACTIVE) {
                activeJobs++;
            }
        }
    }

    receive() external payable {}
}