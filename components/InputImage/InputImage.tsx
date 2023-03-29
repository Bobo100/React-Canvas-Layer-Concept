
interface InputFileProps {
    labelId: string;
    placeholderText: string;
    onFileUpload: (file: string) => void;
}

const InputImage: React.FC<InputFileProps> = ({ labelId, placeholderText, onFileUpload }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target && e.target.result) {
                // 存入圖片資料
                onFileUpload(e.target.result as string);
            }
        };
        if (e.target.files && e.target.files[0])
            reader.readAsDataURL(e.target.files[0]);
    };

    return (
        <input className='border' type="file" accept='image/*' id={labelId} placeholder={placeholderText} onChange={handleFileChange} />
    );
};

export default InputImage;
