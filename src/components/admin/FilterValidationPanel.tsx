'use client'

import { useState } from 'react'
import { CheckCircle, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import {
  validateFilterHierarchyAction,
  recalculateFilterLevelsAction,
} from '@/app/actions/custom-filters'

interface ValidationIssue {
  filterId: string
  filterName: string
  severity: 'error' | 'warning'
  message: string
}

interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
  totalFilters?: number
  checkedCount?: number
}

export default function FilterValidationPanel() {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)

  async function handleValidate() {
    setIsValidating(true)

    try {
      const result = await validateFilterHierarchyAction()

      if (!result.success) {
        throw new Error(result.error || 'Validation failed')
      }

      setValidationResult(result.data)
    } catch (error) {
      console.error('Validation error:', error)
      setValidationResult({
        valid: false,
        issues: [
          {
            filterId: 'system',
            filterName: 'System',
            severity: 'error',
            message: error instanceof Error ? error.message : 'Validation request failed',
          },
        ],
      })
    } finally {
      setIsValidating(false)
    }
  }

  async function handleRecalculate() {
    setIsRecalculating(true)

    try {
      const result = await recalculateFilterLevelsAction()

      if (!result.success) {
        throw new Error(result.error || 'Recalculation failed')
      }

      // Auto re-validate after recalculation
      await handleValidate()
    } catch (error) {
      console.error('Recalculation error:', error)
      setValidationResult({
        valid: false,
        issues: [
          {
            filterId: 'system',
            filterName: 'System',
            severity: 'error',
            message: error instanceof Error ? error.message : 'Recalculation request failed',
          },
        ],
      })
    } finally {
      setIsRecalculating(false)
    }
  }

  return (
    <div className="filter-validation-panel bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Hierarchy Validation</h3>
        <p className="text-sm text-gray-600">
          Validate filter hierarchy integrity and recalculate levels if needed.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button
          variant="primary"
          onClick={handleValidate}
          disabled={isValidating || isRecalculating}
          isLoading={isValidating}
        >
          {!isValidating && <CheckCircle className="w-4 h-4 mr-2" />}
          Validate Hierarchy
        </Button>

        <Button
          variant="secondary"
          onClick={handleRecalculate}
          disabled={isValidating || isRecalculating}
          isLoading={isRecalculating}
        >
          {!isRecalculating && <RefreshCw className="w-4 h-4 mr-2" />}
          Recalculate Levels
        </Button>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className="validation-results">
          {/* Status Summary */}
          <div
            className={`p-4 rounded-lg mb-4 ${
              validationResult.valid
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {validationResult.valid ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-grow">
                <h4
                  className={`font-semibold mb-1 ${
                    validationResult.valid ? 'text-emerald-900' : 'text-red-900'
                  }`}
                >
                  {validationResult.valid ? 'Hierarchy Valid' : 'Validation Issues Found'}
                </h4>
                <p
                  className={`text-sm ${
                    validationResult.valid ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {validationResult.valid
                    ? 'All filters are correctly configured with no cycles or level inconsistencies.'
                    : `Found ${validationResult.issues.length} issue${
                        validationResult.issues.length !== 1 ? 's' : ''
                      } that need attention.`}
                </p>
                {validationResult.totalFilters !== undefined && (
                  <p className="text-xs text-gray-600 mt-1">
                    Checked {validationResult.checkedCount || validationResult.totalFilters} of{' '}
                    {validationResult.totalFilters} filters
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Issues List */}
          {validationResult.issues.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-gray-900 mb-3">Issues:</h5>
              {validationResult.issues.map((issue, index) => (
                <div
                  key={`${issue.filterId}-${index}`}
                  className={`p-3 rounded-md border ${
                    issue.severity === 'error'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {issue.severity === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full uppercase ${
                            issue.severity === 'error'
                              ? 'bg-red-200 text-red-800'
                              : 'bg-amber-200 text-amber-800'
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <span className="text-xs font-medium text-gray-700">
                          {issue.filterName}
                        </span>
                      </div>
                      <p
                        className={`text-sm ${
                          issue.severity === 'error' ? 'text-red-800' : 'text-amber-800'
                        }`}
                      >
                        {issue.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!validationResult && !isValidating && !isRecalculating && (
        <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-gray-400" />
          <p className="text-sm">Click &quot;Validate Hierarchy&quot; to check for issues</p>
        </div>
      )}
    </div>
  )
}
