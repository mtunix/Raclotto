type SpinnerProps = {
    className?: string;
}

export function Spinner(props: SpinnerProps) {
    return <div className={`spinner-border text-primary ${props.className}`} role="status"/>;
}

export function SpinnerContainer() {
    return (
        <div className="container">
            <div
                className="row align-items-center text-light mt-5">
                <div className="col-md-12 text-center">
                    <Spinner />
                </div>
            </div>
        </div>
    );
}