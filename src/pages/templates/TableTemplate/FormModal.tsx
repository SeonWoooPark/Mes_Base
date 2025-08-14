/**
 * 폼 모달 컴포넌트
 * 
 * 등록/수정용 폼을 모달로 표시합니다.
 * 기존 ProductFormModal을 일반화한 버전입니다.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TableConfig } from './types';
import { FormField } from '../../../shared/types/common';
import { Modal, Button, Flex, Input, Select, Textarea } from '../../../presentation/utils/styled';

interface FormModalProps<T> {
  config: TableConfig<T>;
  isOpen: boolean;
  item?: T;
  onClose: () => void;
  onSuccess: () => void;
}

export function FormModal<T extends { id: string }>({
  config,
  isOpen,
  item,
  onClose,
  onSuccess
}: FormModalProps<T>) {
  
  // === 상태 관리 ===
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  const isEdit = !!item;

  // === 폼 데이터 초기화 ===
  useEffect(() => {
    if (isOpen) {
      if (item) {
        // 수정 모드: 기존 데이터로 초기화
        const initialData: Record<string, any> = {};
        config.formFields.forEach(field => {
          initialData[field.name] = (item as any)[field.name] || '';
        });
        setFormData(initialData);
      } else {
        // 등록 모드: 빈 데이터로 초기화
        const initialData: Record<string, any> = {};
        config.formFields.forEach(field => {
          initialData[field.name] = '';
        });
        setFormData(initialData);
      }
      setErrors({});
    }
  }, [isOpen, item, config.formFields]);

  // === 입력값 변경 ===
  const handleInputChange = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // 에러 클리어
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  }, [errors]);

  // === 유효성 검증 ===
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    config.formFields.forEach(field => {
      const value = formData[field.name];

      // 필수 필드 검증
      if (field.required && (!value || String(value).trim() === '')) {
        newErrors[field.name] = `${field.label}은(는) 필수 입력 항목입니다.`;
        return;
      }

      // 타입별 검증
      if (value && field.validation) {
        const validation = field.validation;

        // 패턴 검증
        if (validation.pattern && !validation.pattern.test(String(value))) {
          newErrors[field.name] = `${field.label} 형식이 올바르지 않습니다.`;
          return;
        }

        // 길이 검증
        const stringValue = String(value);
        if (validation.minLength && stringValue.length < validation.minLength) {
          newErrors[field.name] = `${field.label}은(는) 최소 ${validation.minLength}글자 이상이어야 합니다.`;
          return;
        }
        if (validation.maxLength && stringValue.length > validation.maxLength) {
          newErrors[field.name] = `${field.label}은(는) 최대 ${validation.maxLength}글자까지 입력 가능합니다.`;
          return;
        }

        // 숫자 범위 검증
        if (field.type === 'number') {
          const numValue = Number(value);
          if (validation.min !== undefined && numValue < validation.min) {
            newErrors[field.name] = `${field.label}은(는) ${validation.min} 이상이어야 합니다.`;
            return;
          }
          if (validation.max !== undefined && numValue > validation.max) {
            newErrors[field.name] = `${field.label}은(는) ${validation.max} 이하여야 합니다.`;
            return;
          }
        }

        // 커스텀 검증
        if (validation.custom) {
          const customError = validation.custom(value);
          if (customError) {
            newErrors[field.name] = customError;
            return;
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [config.formFields, formData]);

  // === 폼 제출 ===
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      if (isEdit && item) {
        await config.api.update(item.id, formData);
      } else {
        await config.api.create(formData);
      }
      
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.';
      alert(message);
    } finally {
      setLoading(false);
    }
  }, [validateForm, isEdit, item, formData, config.api, onSuccess]);

  // === 필드 렌더링 ===
  const renderField = useCallback((field: FormField) => {
    if (field.hidden) return null;

    const value = formData[field.name] || '';
    const error = errors[field.name];
    const disabled = field.disabled || loading;

    const commonProps = {
      value,
      disabled,
      required: field.required,
      style: error ? { borderColor: '#dc3545' } : undefined
    };

    let input: React.ReactNode;

    switch (field.type) {
      case 'textarea':
        input = (
          <Textarea
            {...commonProps}
            placeholder={field.placeholder}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            rows={4}
          />
        );
        break;

      case 'select':
        input = (
          <Select
            {...commonProps}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
          >
            <option value="">선택하세요</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </Select>
        );
        break;

      case 'checkbox':
        input = (
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!value}
              disabled={disabled}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            {field.placeholder || '체크'}
          </label>
        );
        break;

      default:
        input = (
          <Input
            {...commonProps}
            type={field.type}
            placeholder={field.placeholder}
            onChange={(e) => {
              const inputValue = field.type === 'number' ? 
                (e.target.value ? Number(e.target.value) : '') : 
                e.target.value;
              handleInputChange(field.name, inputValue);
            }}
          />
        );
    }

    return (
      <div key={field.name} style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          marginBottom: '4px',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#495057'
        }}>
          {field.label}
          {field.required && <span style={{ color: '#dc3545' }}>*</span>}
        </label>
        {input}
        {error && (
          <div style={{
            color: '#dc3545',
            fontSize: '12px',
            marginTop: '4px'
          }}>
            {error}
          </div>
        )}
      </div>
    );
  }, [formData, errors, loading, handleInputChange]);

  if (!isOpen) return null;

  return (
    <Modal>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '24px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e9ecef'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>
            {isEdit ? '수정' : '등록'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999'
            }}
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {config.formFields.map(renderField)}
          </div>

          {/* 버튼 */}
          <Flex justify="flex-end" gap={8} style={{
            paddingTop: '16px',
            borderTop: '1px solid #e9ecef'
          }}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? '저장 중...' : (isEdit ? '수정' : '등록')}
            </Button>
          </Flex>
        </form>
      </div>
    </Modal>
  );
}