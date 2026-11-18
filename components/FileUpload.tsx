"use client"
import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadIcon } from "@/components/icons";

interface SingleFileDropzoneProps {
    onFileSelect: (file: File | null) => void;
    disabled?: boolean;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPT = {
    "image/png": [] as string[],
    "image/jpeg": [] as string[],
    "image/webp": [] as string[],
};
const ACCEPTED_TYPES = Object.keys(ACCEPT);
const TOO_LARGE_MSG = "That image is over 5MB. Try a smaller of cropped one.";

function describeRejection(rejection: FileRejection): string {
    let error = rejection.errors[0];
    switch (error?.code) {
        case "file-too-large":
            return TOO_LARGE_MSG;
        case "file-invalid-type":
            return "Use a PNG, JPG. or WebP image.";
        case "too-many-files":
            return "Add one image at a time.";
        default:
            return error?.message ?? "That file can not be used.";
    }
}

export default function SingleFileDropzone({ onFileSelect, disabled = false }: SingleFileDropzoneProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const acceptFile = useCallback((file: File) => {
        setErrorMessage(null);
        setSelectedFile(file);
        onFileSelect(file);
    }, [onFileSelect])

    const onDrop = useCallback(
        (acceptedFiles: File[], fileRejections: FileRejection[]) => {
            // Handle rejections (e.g., user dropped multiple files or wrong file type)
            if (fileRejections.length > 0) {
                setErrorMessage(describeRejection(fileRejections[0]));
                return;
            }

            // Grab the single accepted file
            if (acceptedFiles.length > 0) {
                acceptFile(acceptedFiles[0]);
            }
        },
        [acceptFile]
    );

    // getRootProps: a function for returning an object of props for the outer dropzone 
    //      container to attach all necessary drag-and-drop click events
    // getInputProps: a function for returning an object of props to spread onto a hidden
    //      <input type="file" /> inside the container to handle native file selection dialogs
    // isDragActive: A boolean state variable to tracking whether a file is currently being
    //      dragged over the dropzone. 
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        maxFiles: 1,
        accept: ACCEPT,
        maxSize: MAX_SIZE,
        disabled,
    });

    useEffect(() => {
        if (disabled) return;

        function handlePaste(e: ClipboardEvent) {
            const file = Array.from(e.clipboardData?.files ?? []).find(f => {
                return ACCEPTED_TYPES.includes(f.type);
            });
            if (!file) return;

            e.preventDefault();
            if (file.size > MAX_SIZE) {
                setErrorMessage(TOO_LARGE_MSG);
                return;
            }

            acceptFile(file);
        }

        document.addEventListener("paste", handlePaste);
        return () => document.removeEventListener("paste", handlePaste);
    }, [acceptFile, disabled]);

    useEffect(() => {
        if (!selectedFile) return;
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [selectedFile]);

    const handleRemoveFile = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation(); // Prevent triggering the file dialog when clicking remove
        setSelectedFile(null);
        setPreviewUrl(null);
        setErrorMessage(null);
        onFileSelect(null);
    };

    const boxClass = [
        "border border-dashed px-5 py-10 text-center transition-colors sm:px-8 sm:py-12",
        isDragActive ? "border-ink bg-lime-wash" : "border-ink/40 bg-surface/80 hover:border-ink",
        disabled ? "cursor-wait opacity-60" : "cursor-pointer",
    ].join(" ");


    return (
        <div>
            <div {...getRootProps({ className: boxClass })}>
                <input {...getInputProps()} />

                {selectedFile ? (
                    <div className="flex items-center gap-4 text-left">
                        {previewUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={previewUrl}
                                alt="Preview of the selected QR code"
                                className="h-16 w-16 shrink-0 border border-line bg-white object-contain"
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-lg font-bold">{selectedFile.name}</p>
                            <p className="font-mono text-xs text-muted">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleRemoveFile}
                            disabled={disabled}
                            className="shrink-0 border border-ink/30 px-3 py-1.5 text-sm font-semibold transition-colors hover:border-ink hover:bg-ink hover:text-white disabled:opacity-50"
                        >
                            Remove
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <span className="grid h-14 w-14 place-items-center bg-ink text-white">
                            <UploadIcon />
                        </span>
                        <p className="mt-5 font-display text-xl font-bold">
                            {isDragActive ? "Drop the image here" : "Drop a QR image or browse"}
                        </p>
                        <p className="mt-2 font-mono text-xs text-muted">PNG, JPG or WebP, up to 5 MB</p>
                        <p className="mt-1 text-sm text-muted">You can also paste an image with Ctrl+V or Cmd+V.</p>
                    </div>
                )}
            </div>

            {errorMessage && (
                <p role="alert" className="mt-3 text-sm font-semibold text-alarm-ink">
                    {errorMessage}
                </p>
            )}
        </div>
    );
};
