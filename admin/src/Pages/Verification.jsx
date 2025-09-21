// admin/src/pages/Verification.jsx
import React, { useState, useEffect } from "react";
import {
  User,
  Eye,
  Check,
  X,
  Shield,
  Clock,
  Search,
  RefreshCw,
} from "lucide-react";
import {
  getPendingVerifications,
  approveVerification,
  rejectVerification,
} from "../Api/verification";

const Verification = () => {
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch pending verifications
  const fetchPending = async () => {
    try {
      setLoading(true);
      const { data } = await getPendingVerifications();
      const mappedData = (data.data.verifications || []).map((v) => ({
        ...v,
        selfieUrl: v.selfie?.url || null,
        idPictureUrl: v.idPicture?.url || null,
      }));
      setPendingVerifications(mappedData);
    } catch (err) {
      console.error("Failed to fetch pending verifications:", err);
      alert("Failed to fetch pending verifications. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPending();
    setRefreshing(false);
  };

  const handleApproveWorker = async () => {
    if (!selectedWorker) return;
    try {
      setActionLoading(true);
      await approveVerification(selectedWorker._id, verificationNotes);
      setPendingVerifications((prev) =>
        prev.filter((w) => w._id !== selectedWorker._id)
      );
      setShowModal(false);
      setSelectedWorker(null);
      setVerificationNotes("");
      alert("Worker verified successfully!");
    } catch (err) {
      console.error("Error approving worker:", err);
      const msg = err.response?.data?.message || "Error approving worker.";
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectWorker = async () => {
    if (!selectedWorker) return;

    const reason = rejectionReason.trim();
    if (!reason) {
      alert("Please enter a rejection reason.");
      return;
    }

    if (selectedWorker.verificationStatus !== "pending") {
      alert("Only pending workers can be rejected.");
      return;
    }

    try {
      setActionLoading(true);
      await rejectVerification(selectedWorker._id, reason, true);
      setPendingVerifications((prev) =>
        prev.filter((w) => w._id !== selectedWorker._id)
      );
      setShowModal(false);
      setShowRejectModal(false);
      setSelectedWorker(null);
      setRejectionReason("");
      alert("Worker verification rejected!");
    } catch (err) {
      console.error("Error rejecting worker:", err);
      const msg = err.response?.data?.message || "Error rejecting worker.";
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredVerifications = pendingVerifications.filter(
    (worker) =>
      worker.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (worker.email &&
        worker.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      : "N/A";

  useEffect(() => {
    fetchPending();
  }, []);

  return (
    <div className="p-4 sm:ml-64 overflow-hidden">
      <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                Worker Verification Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Review and verify worker identification documents
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-gray-600">
                  Pending:{" "}
                  <span className="font-semibold">
                    {pendingVerifications.length}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Verifications Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-gray-600">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Loading verifications...
              </div>
            </div>
          ) : filteredVerifications.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No pending verifications
              </h3>
              <p className="text-gray-600">
                All verification requests have been processed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Worker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVerifications.map((worker) => (
                    <tr key={worker._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {worker.fullName}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {worker.credentialId?.slice(-8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {worker.email || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <Clock className="h-3 w-3 mr-1" />
                          {worker.verificationStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(worker.idVerificationSubmittedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {/* <button
                          onClick={() => {
                            setSelectedWorker(worker);
                            setShowModal(true);
                          }}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900 transition-colors cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </button> */}
                        <button
                          onClick={() => {
                            setSelectedWorker(worker);
                            setShowModal(true);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-[#55b3f3] text-white rounded hover:bg-sky-600 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Verification Modal */}
      {showModal && selectedWorker && (
        <VerificationModal
          worker={selectedWorker}
          showRejectModal={showRejectModal}
          setShowRejectModal={setShowRejectModal}
          verificationNotes={verificationNotes}
          setVerificationNotes={setVerificationNotes}
          rejectionReason={rejectionReason}
          setRejectionReason={setRejectionReason}
          actionLoading={actionLoading}
          onApprove={handleApproveWorker}
          onReject={handleRejectWorker}
          onClose={() => {
            setShowModal(false);
            setSelectedWorker(null);
            setVerificationNotes("");
            setRejectionReason("");
          }}
        />
      )}
    </div>
  );
};

// Modal Component
const VerificationModal = ({
  worker,
  showRejectModal,
  setShowRejectModal,
  verificationNotes,
  setVerificationNotes,
  rejectionReason,
  setRejectionReason,
  actionLoading,
  onApprove,
  onReject,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-[#f4f6f6] bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-md">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Verification Documents - {worker.fullName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Images */}
        <div className="p-6 flex flex-col sm:flex-row gap-6">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Selfie</h3>
            <img
              src={worker.selfieUrl || "/placeholder.png"}
              alt="Worker Selfie"
              className="w-full h-64 object-contain rounded border border-gray-200"
            />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              ID Picture
            </h3>
            <img
              src={worker.idPictureUrl || "/placeholder.png"}
              alt="Worker ID"
              className="w-full h-64 object-contain rounded border border-gray-200"
            />
          </div>
        </div>

        {/* Notes & Actions */}
        <div className="p-6 border-t border-gray-200 flex flex-col gap-4">
          <textarea
            value={verificationNotes}
            onChange={(e) => setVerificationNotes(e.target.value)}
            placeholder="Add verification notes (optional)..."
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <div className="flex gap-2 justify-end">
            <button
              onClick={onApprove}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Approve
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Reject
            </button>
          </div>

          {/* Reject reason modal */}
          {showRejectModal && (
            <div className="mt-4 p-4 border border-red-300 rounded-lg bg-red-50 flex flex-col gap-2">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onReject}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Verification;
